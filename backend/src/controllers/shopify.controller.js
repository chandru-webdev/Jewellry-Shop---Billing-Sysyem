const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const ApiError = require('../utils/ApiError')
const shopifyService = require('../services/shopify.service')
const shopifyConfigService = require('../services/shopifyConfig.service')
const syncProgress = require('../services/syncProgress.service')
const pipeProgressStream = require('../utils/progressStream')
const prisma = require('../prisma/client')

// Kick off a bulk sync in the background and stream its progress. The POST
// returns immediately with a jobId; the frontend opens the SSE stream for that
// jobId to see live, colour-coded per-product progress. `countQuery` resolves
// the number of items and `run` is the job function (reads r.ok/r.failed).
//
// Two syncs of the same kind running at once is a real failure mode, not a
// harmless duplicate: both write the same products, so their workers fight over
// Shopify's per-product lock and the losers fail with 409 "currently being
// modified". `kind` keys a guard so a second click is rejected up front.
//
// When `reattach` is true (the combined "Sync All" button) a second click
// during a running job returns the existing jobId instead of a 409, so the UI
// can simply reopen the panel attached to the job that is already going.
const activeBulkJobs = new Map()

async function startBulkJob({ kind, title, countQuery, run, reattach = false }) {
  if (kind && activeBulkJobs.has(kind)) {
    if (reattach) return { jobId: activeBulkJobs.get(kind), reattached: true }
    throw new ApiError(
      409,
      `A ${kind.toLowerCase()} sync is already running. Wait for it to finish before starting another.`
    )
  }

  const jobId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  // Claim the slot before the first await. Claiming it after countQuery() left a
  // window where two simultaneous clicks both passed the guard above and then
  // both started, which is the overlap the guard exists to prevent.
  if (kind) activeBulkJobs.set(kind, jobId)

  let scope = 0
  let stages = null
  try {
    const counted = await countQuery()
    if (counted && typeof counted === 'object') {
      scope = counted.total || 0
      stages = counted.stages || null
    } else {
      scope = counted
    }
  } catch (err) {
    if (kind && activeBulkJobs.get(kind) === jobId) activeBulkJobs.delete(kind)
    throw err
  }

  syncProgress.startBulk(jobId, { title, total: scope, stages })
  // `run` receives jobId as an argument: the job function may report progress
  // synchronously (before startBulkJob resolves), so it must not close over the
  // caller's `jobId` binding, which is still in its temporal dead zone.
  run(jobId)
    .then((r) => syncProgress.finishBulk(jobId, 'success', { ok: r.ok, failed: r.failed, total: r.total }))
    .catch((err) => {
      console.error(`Bulk sync ${jobId} failed:`, err.message)
      syncProgress.finishBulk(jobId, 'failed', { message: (err && err.message) || 'Sync failed' })
    })
    .finally(() => {
      if (kind && activeBulkJobs.get(kind) === jobId) activeBulkJobs.delete(kind)
    })
  return { jobId, reattached: false }
}

const shopifyController = {
  // GET /api/shopify/config — masked connection details for Settings
  getConfig: asyncHandler(async (req, res) => {
    const data = await shopifyConfigService.getMasked()
    success(res, 200, data, 'Shopify config fetched')
  }),

  // PUT /api/shopify/config — save store credentials, test, register webhooks
  saveConfig: asyncHandler(async (req, res) => {
    const data = await shopifyConfigService.save(req.body, req.user.id)
    success(res, 200, data, 'Shopify connected')
  }),

  // DELETE /api/shopify/config — drop stored credentials (fall back to env)
  clearConfig: asyncHandler(async (req, res) => {
    const data = await shopifyConfigService.clear(req.user.id, req.body?.adminPassword)
    success(res, 200, data, 'Shopify credentials removed')
  }),

  // POST /api/shopify/test-connection — live probe against current credentials
  testConnection: asyncHandler(async (req, res) => {
    const data = await shopifyConfigService.testConnection()
    success(res, 200, data, 'Connection test passed')
  }),

  // POST /api/shopify/webhooks/register — ensure required webhooks are subscribed
  ensureWebhooks: asyncHandler(async (req, res) => {
    const data = await shopifyConfigService.ensureWebhooks()
    success(res, 200, data, 'Webhook check complete')
  }),

  // POST /api/shopify/sync/products — push one product
  //
  // Backs the per-row "Sync" button. It feeds the same per-product progress
  // tracker the edit form uses, so the button can show the identical
  // colour-coded step list over SSE, and records the attempt so the sync
  // history drawer accounts for it.
  syncOneProduct: asyncHandler(async (req, res) => {
    const productId = Number(req.params.id)
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, pushToShopify: true },
    })
    if (!product) throw new ApiError(404, 'Product not found')

    // Products flagged "don't push to Shopify" are billing-software-only and are
    // never published, so an on-demand push must not sneak one onto the store.
    if (product.pushToShopify === false) {
      throw new ApiError(
        400,
        `${product.name} is marked "don't push to Shopify". Turn that on for this product before syncing it.`
      )
    }

    syncProgress.start(productId)
    // This path doesn't re-save or re-price the ERP record, so those two steps
    // would sit on "pending" forever in the step list.
    syncProgress.report(productId, 'save', 'skipped', 'Already saved in ERP')
    syncProgress.report(productId, 'price', 'skipped', 'Not re-calculated')

    try {
      const result = await shopifyService.syncProduct(productId, {
        onProgress: (key, status, message) => syncProgress.report(productId, key, status, message),
      })
      syncProgress.finish(productId, 'success', 'Synced to Shopify')
      shopifyService.logSync('PRODUCT', 1, 0, null, req.user.id, 1).catch(() => {})
      success(res, 200, result, 'Product synced to Shopify')
    } catch (err) {
      const message = (err && err.message) || 'Shopify sync failed'
      syncProgress.finish(productId, 'failed', message)
      await shopifyService.markSyncFailed(productId, message)
      shopifyService
        .logSync('PRODUCT', 0, 1, message, req.user.id, 1, [
          { id: product.id, sku: product.sku, name: product.name, message },
        ])
        .catch(() => {})
      throw err
    }
  }),

  // POST /api/shopify/sync/all-products — push every active product
  syncAllProducts: asyncHandler(async (req, res) => {
    const { jobId } = await startBulkJob({
      kind: 'PRODUCT',
      title: 'Syncing products to Shopify',
      countQuery: () => prisma.product.count({ where: { isActive: true } }),
      run: (jobId) => shopifyService.syncAllProducts(req.user.id, {
        onBulk: (key, label, status, message) => syncProgress.reportBulk(jobId, key, status, label, message),
      }),
    })
    success(res, 202, { jobId }, 'Product sync started')
  }),

  // POST /api/shopify/sync/prices
  syncAllPrices: asyncHandler(async (req, res) => {
    const { jobId } = await startBulkJob({
      kind: 'PRICE',
      title: 'Syncing prices to Shopify',
      countQuery: () => prisma.product.count({ where: { isActive: true, shopifyVariantId: { not: null } } }),
      run: (jobId) => shopifyService.syncAllPrices(req.user.id, {
        onBulk: (key, label, status, message) => syncProgress.reportBulk(jobId, key, status, label, message),
      }),
    })
    success(res, 202, { jobId }, 'Price sync started')
  }),

  // POST /api/shopify/sync/inventory
  syncAllInventory: asyncHandler(async (req, res) => {
    const { jobId } = await startBulkJob({
      kind: 'INVENTORY',
      title: 'Syncing inventory to Shopify',
      countQuery: () => prisma.product.count({ where: { shopifyInventoryItemId: { not: null } } }),
      run: (jobId) => shopifyService.syncAllInventory(req.user.id, {
        onBulk: (key, label, status, message) => syncProgress.reportBulk(jobId, key, status, label, message),
      }),
    })
    success(res, 202, { jobId }, 'Inventory sync started')
  }),

  // POST /api/shopify/sync/all — one job that pushes products, prices and
  // inventory, then pulls orders, as a sequence of stages. Backs the dashboard
  // "Sync All" button. Unlike the per-type jobs this reattaches: pressing it
  // while a combined job is already running returns that job's id so the UI
  // reopens the live panel instead of starting a duplicate.
  syncAll: asyncHandler(async (req, res) => {
    const { jobId, reattached } = await startBulkJob({
      kind: 'ALL',
      title: 'Syncing everything to Shopify',
      reattach: true,
      countQuery: () => shopifyService.countSyncScope(),
      run: (jobId) => shopifyService.syncAllCombined(req.user.id, {
        onBulk: (stage, key, label, status, message) =>
          syncProgress.reportBulk(jobId, `${stage}:${key}`, status, label, message),
        onStage: (stageKey, label) => {
          const snap = syncProgress.getSnapshot(jobId)
          const stage = snap?.stages?.find((s) => s.key === stageKey)
          syncProgress.startStage(jobId, {
            key: stageKey,
            label,
            index: (snap?.stages?.findIndex((s) => s.key === stageKey) ?? 0) + 1,
            count: stage?.count || 0,
          })
        },
        onStageDone: (stageKey, patch) => syncProgress.finishStage(jobId, stageKey, patch),
      }),
    })
    success(res, 202, { jobId, reattached }, reattached ? 'Sync already running' : 'Sync started')
  }),

  // GET /api/shopify/sync/active — the jobId of the combined sync currently
  // running, if any. The dashboard uses this on mount to reattach to a run that
  // is still going (e.g. after a page reload) instead of showing it as idle.
  activeSync: asyncHandler(async (req, res) => {
    const jobId = activeBulkJobs.get('ALL') || null
    success(res, 200, { jobId }, 'Active sync fetched')
  }),

  // GET /api/shopify/sync-progress/:jobId — current snapshot of a bulk job
  getBulkProgress: asyncHandler(async (req, res) => {
    const data = syncProgress.getSnapshot(req.params.jobId)
    success(res, 200, data, 'Sync progress fetched')
  }),

  // GET /api/shopify/sync-progress/:jobId/stream — live SSE stream (raw frames)
  getBulkProgressStream: asyncHandler(async (req, res) => {
    pipeProgressStream(req, res, req.params.jobId)
  }),

  // GET /api/shopify/status
  status: asyncHandler(async (req, res) => {
    const result = await shopifyService.syncStatus()
    success(res, 200, result, 'Shopify sync status fetched')
  }),

  // POST /api/shopify/pull-products — pull products from Shopify into ERP
  pullProducts: asyncHandler(async (req, res) => {
    const result = await shopifyService.pullProductsFromShopify(req.user.id)
    success(res, 200, result, 'Products pulled from Shopify')
  }),

  // POST /api/shopify/pull-orders — pull orders from Shopify into ERP
  pullOrders: asyncHandler(async (req, res) => {
    const result = await shopifyService.pullOrdersFromShopify(req.user.id)
    success(res, 200, result, 'Orders pulled from Shopify')
  }),

  // POST /api/shopify/pull-customers — pull customers from Shopify into ERP
  pullCustomers: asyncHandler(async (req, res) => {
    const result = await shopifyService.pullCustomersFromShopify(req.user.id)
    success(res, 200, result, 'Customers pulled from Shopify')
  }),

  // GET /api/shopify/products — fetch products from Shopify (preview)
  fetchProducts: asyncHandler(async (req, res) => {
    const { limit, page, search } = req.query
    const result = await shopifyService.fetchProducts({ limit, page, search })
    success(res, 200, result, 'Products fetched from Shopify')
  }),

  // GET /api/shopify/sync-logs — list sync history (kept for 3 days).
  // Each row carries derived counts: total/ok/failed/pending.
  syncLogs: asyncHandler(async (req, res) => {
    const { type, status, limit: queryLimit } = req.query
    const allowedTypes = ['PRODUCT', 'PRICE', 'INVENTORY', 'ORDER', 'CUSTOMER']
    const allowedStatuses = ['SUCCESS', 'FAILED', 'PENDING']
    const where = {}
    if (type && allowedTypes.includes(type)) where.type = type
    if (status && allowedStatuses.includes(status)) where.status = status

    await shopifyService.pruneSyncHistory()

    const logs = await prisma.shopifySyncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(queryLimit) || 100, 200),
    })

    const shaped = logs.map((l) => {
      const payload = l.payload && typeof l.payload === 'object' ? l.payload : {}
      const ok = typeof payload.ok === 'number' ? payload.ok : l.itemsProcessed
      const failed = typeof payload.failed === 'number' ? payload.failed : 0
      const total = typeof payload.total === 'number' ? payload.total : ok + failed
      const pending = typeof payload.pending === 'number' ? payload.pending : Math.max(total - ok - failed, 0)
      const failures = Array.isArray(payload.failures) ? payload.failures : []
      const warnings = Array.isArray(payload.warnings) ? payload.warnings : []
      return { ...l, total, ok, failed, pending, failures, warnings }
    })
    success(res, 200, shaped, 'Sync logs fetched')
  }),

  // GET /api/shopify/inventory-comparison — ERP vs Shopify stock
  inventoryComparison: asyncHandler(async (req, res) => {
    const data = await shopifyService.inventoryComparison()
    success(res, 200, data, 'Inventory comparison fetched')
  }),

  // GET /api/shopify/price-comparison — ERP vs Shopify prices
  priceComparison: asyncHandler(async (req, res) => {
    const data = await shopifyService.priceComparison()
    success(res, 200, data, 'Price comparison fetched')
  }),

  // POST /api/shopify/sync-logs/retry-failed — re-run the bulk job for each
  // sync type that has FAILED log entries, then clears those stale rows.
  retryFailedSyncs: asyncHandler(async (req, res) => {
    const result = await shopifyService.retryFailedSyncs(req.user.id)
    success(res, 200, result, 'Failed syncs retried')
  }),

  // DELETE /api/shopify/sync-logs — delete FAILED log entries.
  clearFailedLogs: asyncHandler(async (req, res) => {
    const deleted = await prisma.shopifySyncLog.deleteMany({ where: { status: 'FAILED' } })
    success(res, 200, { deleted: deleted.count }, 'Failed sync logs cleared')
  }),
}

module.exports = shopifyController
