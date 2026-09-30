const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const shopifyService = require('../services/shopify.service')
const shopifyConfigService = require('../services/shopifyConfig.service')
const syncProgress = require('../services/syncProgress.service')
const pipeProgressStream = require('../utils/progressStream')
const prisma = require('../prisma/client')

// Kick off a bulk sync in the background and stream its progress. The POST
// returns immediately with a jobId; the frontend opens the SSE stream for that
// jobId to see live, colour-coded per-product progress. `countQuery` resolves
// the number of items and `run` is the job function (reads r.ok/r.failed).
async function startBulkJob({ title, countQuery, run }) {
  const total = await countQuery()
  const jobId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  syncProgress.startBulk(jobId, { title, total })
  run()
    .then((r) => syncProgress.finishBulk(jobId, 'success', { ok: r.ok, failed: r.failed, total: r.total }))
    .catch((err) => {
      console.error(`Bulk sync ${jobId} failed:`, err.message)
      syncProgress.finishBulk(jobId, 'failed', { message: (err && err.message) || 'Sync failed' })
    })
  return jobId
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
  syncOneProduct: asyncHandler(async (req, res) => {
    const result = await shopifyService.syncProduct(req.params.id)
    success(res, 200, result, 'Product synced to Shopify')
  }),

  // POST /api/shopify/sync/all-products — push every active product
  syncAllProducts: asyncHandler(async (req, res) => {
    const jobId = await startBulkJob({
      title: 'Syncing products to Shopify',
      countQuery: () => prisma.product.count({ where: { isActive: true } }),
      run: () => shopifyService.syncAllProducts(req.user.id, {
        onBulk: (key, label, status, message) => syncProgress.reportBulk(jobId, key, status, label, message),
      }),
    })
    success(res, 202, { jobId }, 'Product sync started')
  }),

  // POST /api/shopify/sync/prices
  syncAllPrices: asyncHandler(async (req, res) => {
    const jobId = await startBulkJob({
      title: 'Syncing prices to Shopify',
      countQuery: () => prisma.product.count({ where: { isActive: true, shopifyVariantId: { not: null } } }),
      run: () => shopifyService.syncAllPrices(req.user.id, {
        onBulk: (key, label, status, message) => syncProgress.reportBulk(jobId, key, status, label, message),
      }),
    })
    success(res, 202, { jobId }, 'Price sync started')
  }),

  // POST /api/shopify/sync/inventory
  syncAllInventory: asyncHandler(async (req, res) => {
    const jobId = await startBulkJob({
      title: 'Syncing inventory to Shopify',
      countQuery: () => prisma.product.count({ where: { shopifyInventoryItemId: { not: null } } }),
      run: () => shopifyService.syncAllInventory(req.user.id, {
        onBulk: (key, label, status, message) => syncProgress.reportBulk(jobId, key, status, label, message),
      }),
    })
    success(res, 202, { jobId }, 'Inventory sync started')
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
      return { ...l, total, ok, failed, pending, failures }
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
