// =============================================================
// Real-time sync progress.
//
// Two job shapes live together:
//   - Per-product: product.service.update() records the steps of a
//     product save + Shopify push; the product update page streams
//     those steps over SSE.
//   - Bulk: shopify.controller's sync/all-* endpoints record one row
//     per product as a bulk job streams; the sync buttons show the
//     live progress over SSE.
//
// In-memory only. A finished job is kept for a few minutes so a
// late subscriber still receives the final snapshot, then dropped.
// Stale running jobs expire too (a request that errored before
// finishing must not leak forever).
// =============================================================

const STEP_LABELS = {
  save: 'Saving product',
  price: 'Recalculating price',
  shopifyImages: 'Reading store images',
  shopifyProduct: 'Updating product details',
  shopifyVariant: 'Updating variant & price',
  shopifyInventory: 'Syncing inventory',
  shopifyMetafields: 'Pushing storefront details',
  shopifyMedia: 'Uploading media & videos',
}

const STEP_ORDER = Object.keys(STEP_LABELS)

// Shopify-backed steps — skipped wholesale when the product isn't linked.
const SHOPIFY_STEPS = STEP_ORDER.filter((key) => key.startsWith('shopify'))

const FINISHED_TTL_MS = 5 * 60 * 1000 // finished jobs kept 5 minutes
const RUNNING_TTL_MS = 15 * 60 * 1000 // stale running jobs dropped after 15 min

const jobs = new Map() // jobKey (String) -> job

function buildSteps() {
  return STEP_ORDER.map((key) => ({ key, label: STEP_LABELS[key], status: 'pending', message: '' }))
}

function touch(job) {
  job.updatedAt = new Date().toISOString()
}

function snap(job) {
  const done = job.steps.filter((s) => s.status === 'done').length
  return {
    ...(job.productId != null ? { productId: job.productId } : {}),
    ...(job.jobId != null ? { jobId: job.jobId } : {}),
    ...(job.kind ? { kind: job.kind } : {}),
    ...(job.title ? { title: job.title } : {}),
    ...(job.total ? { total: job.total } : {}),
    ...(job.summary ? { summary: { ...job.summary } } : {}),
    done,
    status: job.status,
    message: job.message,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    updatedAt: job.updatedAt,
    steps: job.steps.map((s) => ({ ...s })),
  }
}

function getJob(jobKey) {
  if (jobKey == null) return null
  const id = String(jobKey)
  const job = jobs.get(id)
  if (!job) return null
  const age = Date.now() - new Date(job.startedAt).getTime()
  if (job.finishedAt && age > FINISHED_TTL_MS) {
    jobs.delete(id)
    return null
  }
  if (!job.finishedAt && age > RUNNING_TTL_MS) {
    jobs.delete(id)
    return null
  }
  return job
}

function emit(job) {
  const payload = snap(job)
  for (const fn of Array.from(job.subscribers)) {
    try {
      fn(payload)
    } catch {
      // a handler error must never break the broadcast
    }
  }
}

// Create/freshly reset the job for a product. Safe to call more than once.
function start(productId) {
  const now = new Date().toISOString()
  const job = {
    productId: String(productId),
    status: 'running',
    message: 'Starting update…',
    startedAt: now,
    finishedAt: null,
    updatedAt: now,
    steps: buildSteps(),
    subscribers: new Set(),
  }
  jobs.set(job.productId, job)
  return job
}

// Create a bulk sync job. `title` names the overall task and `total` is the
// number of items that will be processed. Items are reported via reportBulk.
function startBulk(jobId, { title = 'Syncing…', total = 0 } = {}) {
  const now = new Date().toISOString()
  const job = {
    jobId: String(jobId),
    kind: 'bulk',
    title,
    total: Number(total) || 0,
    status: 'running',
    message: 'Starting…',
    startedAt: now,
    finishedAt: null,
    updatedAt: now,
    steps: [],
    subscribers: new Set(),
  }
  jobs.set(job.jobId, job)
  return job
}

// Record one step transition and broadcast it to subscribers.
function report(productId, key, status, message) {
  const job = getJob(productId)
  if (!job) return
  const step = job.steps.find((s) => s.key === key)
  if (step) {
    step.status = status
    step.message = message || ''
  }
  if (status === 'failed') job.status = 'failed'
  job.message = message || job.message
  touch(job)
  emit(job)
}

// Record one item's status inside a bulk job. The row is created on first
// sight; repeated calls update it in place so per-item inner progress can
// stream as the item's "message".
function reportBulk(jobId, key, status, label, message) {
  const job = getJob(jobId)
  if (!job || job.kind !== 'bulk') return
  const id = String(key)
  let step = job.steps.find((s) => s.key === id)
  if (!step) {
    step = { key: id, label: label || id, status: 'pending', message: '' }
    job.steps.push(step)
  }
  step.status = status
  if (label) step.label = label
  step.message = message || ''
  const done = job.steps.filter((s) => s.status === 'done').length
  const failed = job.steps.filter((s) => s.status === 'failed').length
  job.message = job.total
    ? `${done}/${job.total} synced${failed ? `, ${failed} failed` : ''}`
    : message || job.message
  touch(job)
  emit(job)
}

// Finish a bulk job with the summary the button shows in its toast.
function finishBulk(jobId, result, { ok = 0, failed = 0, total = 0, message = '' } = {}) {
  const job = getJob(jobId)
  if (!job || job.kind !== 'bulk') return
  job.status = result
  job.summary = { ok, failed, total: total || job.total || job.steps.length }
  job.message = message || (failed > 0
    ? `${ok} synced, ${failed} failed`
    : `${ok} synced successfully`)
  job.finishedAt = new Date().toISOString()
  touch(job)
  emit(job)
}

// Mark the whole job done. result: 'success' | 'failed'.
function finish(productId, result, message) {
  const job = getJob(productId)
  if (!job) return
  job.status = result
  job.message = message || ''
  job.finishedAt = new Date().toISOString()
  touch(job)
  emit(job)
}

// Mark every Shopify-backed step as skipped (product has no link / no push).
function skipShopifySteps(productId, note) {
  for (const key of SHOPIFY_STEPS) report(productId, key, 'skipped', note)
}

// Subscribe to updates. The callback is invoked immediately with the current
// snapshot, then on every change. Returns an unsubscribe function.
function subscribe(jobKey, onEvent) {
  const job = getJob(jobKey)
  if (!job) return () => {}
  job.subscribers.add(onEvent)
  try {
    onEvent(snap(job))
  } catch {
    // ignore a bad subscriber
  }
  return () => job.subscribers.delete(onEvent)
}

function getSnapshot(jobKey) {
  const job = getJob(jobKey)
  return job ? snap(job) : null
}

module.exports = {
  start,
  report,
  finish,
  skipShopifySteps,
  startBulk,
  reportBulk,
  finishBulk,
  subscribe,
  getSnapshot,
  STEP_ORDER,
  STEP_LABELS,
  SHOPIFY_STEPS,
}