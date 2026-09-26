// =============================================================
// System Health — read-only diagnostics for every critical link:
//   1. API server          (self-probe GET /api/health)
//   2. Database            (SELECT 1 via Prisma)
//   3. Shopify API         (GET /shop.json -> store name/domain)
//   4. Storefront          (public GET https://<shopDomain>/)
//   5. Email/SMTP          (SMTP_* env + transporter.verify())
//   6. Silver rate source  (current MetalRate + staleness)
//   7. Recent sync status  (last ShopifySyncLog per type + webhooks n/7)
//   8. Last-24h errors     (failed syncs, webhook failures, rate pushes)
//   9. Stuck jobs          (PENDING markers that never completed)
//  10. Test-data detector  (name patterns across Products/Suppliers/Customers)
//  11. Env secrets         (required/shared keys set, NAMES ONLY)
// Checks never return secret VALUES/variables, only presence + status.
// Diagnostic text is scrubbed by sanitizeError before it leaves here.
// =============================================================
const prisma = require('../prisma/client')
const env = require('../config/env')
const { request } = require('../integrations/shopify/client')
const { credentials } = require('../integrations/shopify/shopifyConfig')
const { REQUIRED_TOPICS, webhookCallbackUrl } = require('./webhookRegister.service')

// A silver rate older than this is treated as stale (manual-entry data feed).
const STALE_RATE_DAYS = 7
// Look back this far for "recent errors" (check 8).
const ERROR_WINDOW_MS = 24 * 3600 * 1000
// A PENDING marker older than this has been stuck (check 9).
const STUCK_AFTER_MS = 30 * 60 * 1000
// Substrings that flag test/scratch records in master data (check 10).
const TEST_PATTERNS = ['test', 'e2e', 'sample', 'demo']

const CHECK_KEYS = [
  'api',
  'database',
  'shopify',
  'storefront',
  'email',
  'metalRate',
  'syncs',
  'errors',
  'stuck',
  'testData',
  'env',
]

// Scrub anything that could be a credential BEFORE it is shown anywhere.
// Applied to every diagnostic message/error that leaves this service.
function sanitizeError(text, max = 500) {
  if (text === null || text === undefined) return text
  return String(text)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^/@\s:]+(:[^/@\s]+)?@/gi, '$1***@') // user:pass@ in URLs
    .replace(/([?&]\s*(?:access_token|token|password|pass|secret|signature|code|apikey|api_key)=)[^&\s'"`]+/gi, '$1***')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=+-]+/gi, '$1 ***')
    .replace(/\b(x-shopify-access-token|authorization)\b\s*[:=]\s*[^,"'`]+/gi, '$1: ***')
    .slice(0, max)
}

// Build the per-webhook coverage list shared by the Shopify + syncs checks.
// Known identifier list only — addresses are webhook DB URLs, never secrets.
async function getWebhookCoverage() {
  const { shopDomain, accessToken } = await credentials()
  if (!shopDomain || !accessToken || shopDomain.startsWith('PASTE')) return null
  let existing = []
  try {
    const res = await request('/webhooks.json')
    existing = res?.webhooks || []
  } catch {
    return null // could not verify
  }
  let lastDelivery = {}
  try {
    const grouped = await prisma.webhookEvent.groupBy({ by: ['topic'], _max: { createdAt: true } })
    grouped.forEach((row) => { lastDelivery[row.topic] = row._max.createdAt })
  } catch {
    // last-delivery times are best-effort only
  }
  return REQUIRED_TOPICS.map((topic) => {
    const wh = existing.find((w) => w.topic === topic && w.address === webhookCallbackUrl(topic))
    return {
      topic,
      required: true,
      registered: Boolean(wh),
      address: wh?.address || null,
      lastDelivery: lastDelivery[topic] || null,
    }
  })
}

function extractTitle(html) {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html || '')
  return m && m[1] ? m[1].trim().slice(0, 120) : null
}

async function checkApi() {
  // Self-probe the real HTTP stack (routing + this endpoint) exactly like the
  // frontend would. If the self-request is impossible we still know the API is
  // up, because this handler being reached proves it.
  const startedAt = Date.now()
  const endpoint = `http://localhost:${env.port}/api/health`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(endpoint, { signal: controller.signal })
    clearTimeout(timer)
    const body = await res.json().catch(() => null)
    const latencyMs = Date.now() - startedAt
    if (res.ok) {
      return {
        status: 'ok',
        message: body?.data?.service || 'API responding',
        details: {
          endpoint,
          method: 'GET',
          statusCode: res.status,
          contentType: res.headers.get('content-type') || null,
          latencyMs,
          version: body?.data?.version || null,
          uptimeSec: Math.round(process.uptime()),
        },
      }
    }
    return {
      status: 'down',
      message: `Health probe returned HTTP ${res.status}`,
      details: { endpoint, method: 'GET', statusCode: res.status, contentType: res.headers.get('content-type') || null, latencyMs },
    }
  } catch (err) {
    return {
      status: 'ok',
      message: 'API responding (self-probe unavailable)',
      details: {
        endpoint,
        method: 'GET',
        statusCode: null,
        latencyMs: Date.now() - startedAt,
        uptimeSec: Math.round(process.uptime()),
        sanitizedError: sanitizeError(err?.message, 160),
      },
    }
  }
}

async function checkDatabase() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'ok',
      message: 'Database reachable',
      details: {
        query: 'SELECT 1',
        adapter: 'Prisma + @prisma/adapter-pg',
        latencyMs: Date.now() - startedAt,
        poolNote: 'Prisma manages the connection pool internally — per-connection stats are not exposed.',
      },
    }
  } catch (err) {
    return {
      status: 'down',
      message: sanitizeError(err?.message, 200),
      details: { query: 'SELECT 1', sanitizedError: sanitizeError(err?.message, 400) },
    }
  }
}

async function checkShopify({ withDetail } = {}) {
  const { shopDomain, accessToken } = await credentials()
  if (!shopDomain || !accessToken || shopDomain.startsWith('PASTE')) {
    return { status: 'warn', message: 'Shopify not configured', details: { configured: false } }
  }
  const startedAt = Date.now()
  try {
    const res = await request('/shop.json')
    const shop = res?.shop || {}
    const detail = withDetail ? await getWebhookCoverage() : undefined
    return {
      status: 'ok',
      message: `${shop.name || 'Shopify store'} reachable`,
      details: {
        configured: true,
        apiEndpoint: '/shop.json',
        method: 'GET',
        storeName: shop.name || null,
        shopDomain: shop.myshopify_domain || shopDomain,
        latencyMs: Date.now() - startedAt,
        webhooks: detail || null,
      },
    }
  } catch (err) {
    const message = `Shopify API error: ${sanitizeError(err?.message || err, 200)}`
    return {
      status: 'down',
      message,
      details: { configured: true, shopDomain, apiEndpoint: '/shop.json', sanitizedError: message },
    }
  }
}

async function checkStorefront() {
  const { shopDomain } = await credentials()
  if (!shopDomain || shopDomain.startsWith('PASTE')) {
    return { status: 'warn', message: 'Storefront not configured', details: { configured: false } }
  }
  const url = `https://${shopDomain}/`
  const startedAt = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    clearTimeout(timer)
    const text = await res.text().catch(() => '')
    const finalUrl = res.url || url
    const finalPath = (() => { try { return new URL(finalUrl).pathname } catch { return '' } })()
    const passwordProtected = /<title[^>]*>\s*Password\s*<\/title>/i.test(text) || finalPath.startsWith('/password')
    const title = extractTitle(text)
    const ok = res.ok && !passwordProtected
    return {
      status: ok ? 'ok' : 'warn',
      message: ok ? 'Storefront loads' : passwordProtected ? 'Storefront behind password page' : `Storefront returned HTTP ${res.status}`,
      details: {
        configured: true,
        url,
        finalUrl,
        statusCode: res.status,
        contentType: res.headers.get('content-type') || null,
        latencyMs: Date.now() - startedAt,
        title,
        passwordProtected,
      },
    }
  } catch (err) {
    return {
      status: 'down',
      message: `Storefront unreachable: ${sanitizeError(err?.message, 200)}`,
      details: { configured: true, url, sanitizedError: sanitizeError(err?.message, 300) },
    }
  }
}

async function checkEmail() {
  const host = process.env.SMTP_HOST
  if (!host) {
    // Not a hard failure — reset codes also fall back to the server console.
    return {
      status: 'warn',
      message: 'SMTP not configured — reset codes log to the server console',
      details: { configured: false, fallback: 'console' },
    }
  }
  const port = Number(process.env.SMTP_PORT) || 587
  const secure = process.env.SMTP_SECURE === 'true'
  const startedAt = Date.now()
  try {
    const nodemailer = require('nodemailer')
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ? '(set)' : undefined } : undefined,
    })
    await transport.verify()
    return {
      status: 'ok',
      message: `SMTP server reachable (${host})`,
      details: {
        configured: true,
        host,
        port,
        secure,
        authType: process.env.SMTP_USER ? (process.env.SMTP_PASS ? 'user + set password' : 'user only') : 'none',
        from: process.env.SMTP_FROM || 'noreply@opalline.com',
        latencyMs: Date.now() - startedAt,
      },
    }
  } catch (err) {
    const message = `SMTP connection failed: ${sanitizeError(err?.message, 160)}`
    return {
      status: 'down',
      message,
      details: { configured: true, host, port, secure, sanitizedError: message },
    }
  }
}

async function checkMetalRate({ withDetail } = {}) {
  try {
    const rate = await prisma.metalRate.findUnique({
      where: { metal: 'silver' },
      include: { updatedBy: { select: { name: true } } },
    })
    if (!rate) {
      return { status: 'down', message: 'Silver rate not initialised — run npm run db:seed' }
    }
    const hours = (Date.now() - new Date(rate.updatedAt).getTime()) / 36e5
    const stale = hours > STALE_RATE_DAYS * 24
    const days = Math.floor(hours / 24)
    const when = days >= 7 ? `${Math.floor(days / 7)}w ago` : days > 0 ? `${days}d ${Math.floor(hours % 24)}h ago` : `${Math.round(hours)}h ago`
    const detail = {}
    if (withDetail) {
      const recent = await prisma.metalRateHistory.findMany({
        orderBy: { changedAt: 'desc' },
        take: 10,
        include: { changedBy: { select: { name: true } } },
      })
      detail.recentRateChanges = recent.map((r) => ({
        id: r.id,
        oldRate: String(r.oldRate),
        newRate: String(r.newRate),
        changedAt: r.changedAt,
        changedBy: r.changedBy?.name || null,
        shopifyStatus: r.shopifyStatus || null,
        shopifyMessage: r.shopifyMessage ? sanitizeError(r.shopifyMessage, 200) : null,
      }))
    }
    return {
      status: stale ? 'warn' : 'ok',
      message: `₹${rate.rate}/gm — updated ${when} by ${rate.updatedBy?.name || 'unknown'}`,
      details: {
        rate: String(rate.rate),
        updatedAt: rate.updatedAt,
        updatedBy: rate.updatedBy?.name || null,
        stale,
        ...detail,
      },
    }
  } catch (err) {
    return { status: 'down', message: sanitizeError(err?.message, 200) }
  }
}

const SYNC_TYPES = ['PRODUCT', 'PRICE', 'INVENTORY', 'ORDER', 'CUSTOMER']

async function checkSyncs({ withDetail } = {}) {
  const byType = {}

  try {
    const logs = await Promise.all(
      SYNC_TYPES.map((type) => prisma.shopifySyncLog.findFirst({ where: { type }, orderBy: { id: 'desc' } }))
    )
    SYNC_TYPES.forEach((type, i) => {
      const log = logs[i]
      byType[type] = log
        ? { status: log.status, itemsProcessed: log.itemsProcessed, message: log.message, lastRun: log.createdAt }
        : { status: 'NEVER', lastRun: null }
    })
  } catch (err) {
    return {
      status: 'down',
      message: `Could not read sync logs: ${sanitizeError(err?.message, 160)}`,
    }
  }

  const webhookList = await getWebhookCoverage()
  const webhooksRegistered = webhookList ? webhookList.filter((w) => w.registered).length : null
  const webhooksRequired = REQUIRED_TOPICS.length

  let history = null
  if (withDetail) {
    const perType = await Promise.all(
      SYNC_TYPES.map((type) =>
        prisma.shopifySyncLog.findMany({ where: { type }, orderBy: { id: 'desc' }, take: 10 })
      )
    )
    history = SYNC_TYPES.map((type, i) => ({
      type,
      runs: perType[i].map((r) => ({
        id: r.id,
        status: r.status,
        itemsProcessed: r.itemsProcessed,
        message: r.message ? sanitizeError(r.message, 200) : null,
        createdAt: r.createdAt,
      })),
    }))
  }

  const values = Object.values(byType)
  const anyFailed = values.some((v) => v.status === 'FAILED')
  const anyPending = values.some((v) => v.status === 'PENDING')
  const anyNever = values.some((v) => v.status === 'NEVER')
  const webhooksOk = webhooksRegistered === null || webhooksRegistered === webhooksRequired

  let status = 'ok'
  if (anyFailed || !webhooksOk) status = 'down'
  else if (anyPending || anyNever) status = 'warn'
  const linked = SYNC_TYPES.filter((t) => byType[t].status === 'SUCCESS').length
  let message = `${linked}/${SYNC_TYPES.length} sync types OK`
  if (anyFailed) message += ' — a recent sync failed'
  else if (anyPending) message += ' — a sync is pending'
  else if (anyNever) message += ' — some syncs never ran'
  if (!webhooksOk && webhooksRegistered !== null) {
    message += ` — ${webhooksRegistered}/${webhooksRequired} webhooks registered`
  }

  return {
    status,
    message,
    details: {
      byType,
      webhooksRegistered,
      webhooksRequired,
      webhooksOk,
      webhooks: webhookList || null,
      history,
    },
  }
}

// Last-24h failures from the sources we actually log: sync jobs, webhook
// deliveries and metal-rate push pipelines.
async function checkErrors({ withDetail } = {}) {
  const since = new Date(Date.now() - ERROR_WINDOW_MS)
  try {
    const [syncs, webhooks, ratePushes] = await Promise.all([
      prisma.shopifySyncLog.findMany({
        where: { status: 'FAILED', createdAt: { gte: since } },
        orderBy: { id: 'desc' },
        take: 20,
      }),
      prisma.webhookEvent.findMany({
        where: { error: { not: null }, createdAt: { gte: since } },
        orderBy: { id: 'desc' },
        take: 20,
      }),
      prisma.metalRateHistory.findMany({
        where: { shopifyStatus: 'FAILED', changedAt: { gte: since } },
        orderBy: { id: 'desc' },
        take: 20,
      }),
    ])

    const sources = [
      {
        key: 'syncs',
        label: 'Failed sync jobs',
        count: syncs.length,
        items: syncs.map((s) => ({
          id: s.id,
          type: s.type,
          at: s.createdAt,
          detail: s.message ? sanitizeError(s.message, 200) : null,
        })),
      },
      {
        key: 'webhooks',
        label: 'Webhook failures',
        count: webhooks.length,
        items: webhooks.map((w) => ({
          id: w.id,
          type: w.topic,
          at: w.createdAt,
          detail: sanitizeError(w.error, 200),
        })),
      },
      {
        key: 'ratePushes',
        label: 'Failed rate pushes',
        count: ratePushes.length,
        items: ratePushes.map((r) => ({
          id: r.id,
          type: `silver ₹${r.oldRate} → ₹${r.newRate}`,
          at: r.changedAt,
          detail: r.shopifyMessage ? sanitizeError(r.shopifyMessage, 200) : null,
        })),
      },
    ]
    const total = sources.reduce((sum, s) => sum + s.count, 0)
    return {
      status: total > 0 ? 'warn' : 'ok',
      message: total > 0 ? `${total} error${total === 1 ? '' : 's'} in the last 24 hours` : 'No errors in the last 24 hours',
      details: {
        windowHours: 24,
        since,
        total,
        sources: withDetail ? sources : sources.map(({ key, label, count }) => ({ key, label, count })),
      },
    }
  } catch (err) {
    return {
      status: 'down',
      message: `Could not read error logs: ${sanitizeError(err?.message, 160)}`,
    }
  }
}

// Jobs that wrote a PENDING marker at start but never completed it.
async function checkStuck({ withDetail } = {}) {
  try {
    const [pendingSyncs, pendingRates] = await Promise.all([
      prisma.shopifySyncLog.findMany({ where: { status: 'PENDING' }, orderBy: { id: 'asc' } }),
      prisma.metalRateHistory.findMany({ where: { shopifyStatus: 'PENDING' }, orderBy: { id: 'asc' } }),
    ])
    const now = Date.now()
    const stuckSyncs = pendingSyncs.filter((r) => now - new Date(r.createdAt).getTime() > STUCK_AFTER_MS)
    const stuckRates = pendingRates.filter((r) => now - new Date(r.changedAt).getTime() > STUCK_AFTER_MS)

    const toItems = (rows, startedAtField, typeLabel) =>
      rows.map((r) => ({
        id: r.id,
        type: typeLabel(r),
        startedAt: r[startedAtField],
        ageMin: Math.round((now - new Date(r[startedAtField]).getTime()) / 60000),
      }))

    const total = stuckSyncs.length + stuckRates.length
    return {
      status: total > 0 ? 'warn' : 'ok',
      message: total > 0 ? `${total} stuck job${total === 1 ? '' : 's'} (pending > 30 min)` : 'No stuck jobs',
      details: {
        stuckAfterMin: Math.round(STUCK_AFTER_MS / 60000),
        syncs: withDetail
          ? toItems(stuckSyncs, 'createdAt', (r) => r.type)
          : stuckSyncs.length,
        ratePushes: withDetail
          ? toItems(stuckRates, 'changedAt', (r) => `silver ₹${r.oldRate} → ₹${r.newRate}`)
          : stuckRates.length,
        total,
      },
    }
  } catch (err) {
    return {
      status: 'down',
      message: `Could not scan for stuck jobs: ${sanitizeError(err?.message, 160)}`,
    }
  }
}

// Master-data records whose names look like test/scratch entries. Name-only.
async function checkTestData({ withDetail } = {}) {
  const scan = async (model, options) => {
    const where = {
      OR: TEST_PATTERNS.map((p) => ({ [options.field]: { contains: p, mode: 'insensitive' } })),
    }
    const count = await prisma[model].count({ where })
    const rows = withDetail
      ? await prisma[model].findMany({ where, select: { id: true, name: true }, orderBy: { id: 'asc' }, take: 100 })
      : []
    const matches = (name) => TEST_PATTERNS.filter((p) => String(name).toLowerCase().includes(p.toLowerCase()))
    return {
      count,
      rows: rows.map((r) => ({ id: r.id, name: r.name, matches: matches(r.name) })),
    }
  }

  try {
    const [products, suppliers, customers] = await Promise.all([
      scan('product', { field: 'name' }),
      scan('supplier', { field: 'name' }),
      scan('customer', { field: 'name' }),
    ])
    const total = products.count + suppliers.count + customers.count
    const tables = [
      { key: 'products', label: 'Products', count: products.count, route: '/products', rows: products.rows },
      { key: 'suppliers', label: 'Suppliers', count: suppliers.count, route: '/suppliers', rows: suppliers.rows },
      { key: 'customers', label: 'Customers', count: customers.count, route: '/customers', rows: customers.rows },
    ]
    return {
      status: total > 0 ? 'warn' : 'ok',
      message: total > 0 ? `${total} test record${total === 1 ? '' : 's'} found in master data` : 'No test records found',
      details: {
        patterns: TEST_PATTERNS,
        total,
        tables: withDetail ? tables : tables.map(({ key, label, count, route }) => ({ key, label, count, route })),
      },
    }
  } catch (err) {
    return {
      status: 'down',
      message: `Could not scan for test data: ${sanitizeError(err?.message, 160)}`,
    }
  }
}

async function checkEnv() {
  const required = [
    { key: 'JWT_SECRET', label: 'JWT Secret', required: true },
    { key: 'DATABASE_URL', label: 'Database URL', required: true },
    { key: 'SHOPIFY_SHOP_DOMAIN', label: 'Shopify Domain', required: false },
    { key: 'SHOPIFY_API_KEY', label: 'Shopify API Key', required: false },
    { key: 'SHOPIFY_ACCESS_TOKEN', label: 'Shopify Access Token', required: false },
    { key: 'SHOPIFY_WEBHOOK_SECRET', label: 'Webhook Secret', required: false },
    { key: 'SMTP_HOST', label: 'SMTP Host', required: false },
  ]
  const vars = required.map((v) => ({
    key: v.key,
    label: v.label,
    required: v.required,
    set: Boolean(process.env[v.key]) && !String(process.env[v.key]).startsWith('PASTE'),
  }))
  const missing = vars.filter((v) => v.required && !v.set)
  const setOptional = vars.filter((v) => !v.required && v.set).length
  return {
    status: missing.length ? 'down' : 'ok',
    message:
      missing.length
        ? `Missing required vars: ${missing.map((m) => m.label).join(', ')}`
        : `All required vars set (+${setOptional} optional)`,
    details: { vars },
  }
}

const RUNNERS = {
  api: checkApi,
  database: checkDatabase,
  shopify: checkShopify,
  storefront: checkStorefront,
  email: checkEmail,
  metalRate: checkMetalRate,
  syncs: checkSyncs,
  errors: checkErrors,
  stuck: checkStuck,
  testData: checkTestData,
  env: checkEnv,
}

function computeOverall(checks) {
  const counts = { ok: 0, warn: 0, down: 0 }
  for (const c of checks) {
    if (counts[c.status] === undefined) counts[c.status] = 0
    counts[c.status] += 1
  }
  const status = counts.down > 0 ? 'down' : counts.warn > 0 ? 'warn' : 'ok'
  return { status, counts }
}

async function runOne(key, { withDetail = false } = {}) {
  const runner = RUNNERS[key]
  if (!runner) return null
  const startedAt = Date.now()
  let result
  try {
    result = (await runner({ withDetail })) || { status: 'down', message: 'Check returned no result' }
  } catch (err) {
    result = { status: 'down', message: `Check crashed: ${sanitizeError(err?.message, 160)}` }
  }
  return { key, ...result, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt }
}

const systemHealthService = {
  sanitizeError,

  async getAllChecks() {
    const checks = await Promise.all(CHECK_KEYS.map((key) => runOne(key)))
    return { checkedAt: new Date().toISOString(), overall: computeOverall(checks), checks }
  },

  // The View-details endpoint re-runs the check AND returns the richer
  // diagnostic payload (webhook list, sync history, flagged records, ...).
  async getOneCheck(key) {
    return runOne(String(key || ''), { withDetail: true })
  },
}

module.exports = systemHealthService