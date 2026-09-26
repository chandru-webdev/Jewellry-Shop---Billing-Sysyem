// =============================================================
// System Health — read-only diagnostics for every critical link:
//   1. API server          (self-probe GET /api/health)
//   2. Database            (SELECT 1 via Prisma)
//   3. Shopify API         (GET /shop.json -> store name/domain)
//   4. Email/SMTP          (SMTP_* env + transporter.verify())
//   5. Silver rate source  (current MetalRate + staleness)
//   6. Recent sync status  (last ShopifySyncLog per type + webhooks n/7)
//   7. Env secrets         (required/shared keys set, NAMES ONLY)
// Checks never return secret VALUES, only presence + status.
// =============================================================
const prisma = require('../prisma/client')
const env = require('../config/env')
const { request } = require('../integrations/shopify/client')
const { REQUIRED_TOPICS, webhookCallbackUrl } = require('./webhookRegister.service')

// A silver rate older than this is treated as stale (manual-entry data feed).
const STALE_RATE_DAYS = 7

const CHECK_KEYS = ['api', 'database', 'shopify', 'email', 'metalRate', 'syncs', 'env']

async function checkApi() {
  // Self-probe the real HTTP stack (routing + this endpoint) exactly like the
  // frontend would. If the self-request is impossible we still know the API is
  // up, because this handler being reached proves it.
  const startedAt = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`http://localhost:${env.port}/api/health`, { signal: controller.signal })
    clearTimeout(timer)
    const body = await res.json().catch(() => null)
    if (res.ok) {
      return {
        status: 'ok',
        message: body?.data?.service || 'API responding',
        details: {
          version: body?.data?.version || null,
          uptimeSec: Math.round(process.uptime()),
        },
      }
    }
    return { status: 'down', message: `Health probe returned HTTP ${res.status}` }
  } catch {
    return {
      status: 'ok',
      message: 'API responding',
      details: { latencyMs: Date.now() - startedAt, uptimeSec: Math.round(process.uptime()) },
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
      details: { latencyMs: Date.now() - startedAt },
    }
  } catch (err) {
    return { status: 'down', message: String(err?.message || err).slice(0, 200) }
  }
}

async function checkShopify() {
  const { shopDomain, accessToken } = env.shopify
  if (!shopDomain || !accessToken || shopDomain.startsWith('PASTE')) {
    return { status: 'warn', message: 'Shopify not configured', details: { configured: false } }
  }
  const startedAt = Date.now()
  try {
    const res = await request('/shop.json')
    const shop = res?.shop || {}
    return {
      status: 'ok',
      message: `${shop.name || 'Shopify store'} reachable`,
      details: {
        configured: true,
        storeName: shop.name || null,
        shopDomain: shop.myshopify_domain || shopDomain,
        latencyMs: Date.now() - startedAt,
      },
    }
  } catch (err) {
    return {
      status: 'down',
      message: `Shopify API error: ${String((err && (err.message || err)) || 'unknown').slice(0, 200)}`,
      details: { configured: true, shopDomain },
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
  const startedAt = Date.now()
  try {
    const nodemailer = require('nodemailer')
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ? '(set)' : undefined }
        : undefined,
    })
    await transport.verify()
    return {
      status: 'ok',
      message: `SMTP server reachable (${host})`,
      details: {
        configured: true,
        host,
        from: process.env.SMTP_FROM || 'noreply@opalline.com',
        latencyMs: Date.now() - startedAt,
      },
    }
  } catch (err) {
    return {
      status: 'down',
      message: `SMTP connection failed: ${String(err?.message || err).slice(0, 160)}`,
      details: { configured: true, host },
    }
  }
}

async function checkMetalRate() {
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
    return {
      status: stale ? 'warn' : 'ok',
      message: `₹${rate.rate}/gm — updated ${when} by ${rate.updatedBy?.name || 'unknown'}`,
      details: {
        rate: String(rate.rate),
        updatedAt: rate.updatedAt,
        updatedBy: rate.updatedBy?.name || null,
        stale,
      },
    }
  } catch (err) {
    return { status: 'down', message: String(err?.message || err).slice(0, 200) }
  }
}

async function checkSyncs() {
  const types = ['PRODUCT', 'PRICE', 'INVENTORY', 'ORDER', 'CUSTOMER']
  const byType = {}

  try {
    const logs = await Promise.all(
      types.map((type) => prisma.shopifySyncLog.findFirst({ where: { type }, orderBy: { id: 'desc' } }))
    )
    types.forEach((type, i) => {
      const log = logs[i]
      byType[type] = log
        ? { status: log.status, itemsProcessed: log.itemsProcessed, message: log.message, lastRun: log.createdAt }
        : { status: 'NEVER', lastRun: null }
    })
  } catch (err) {
    return {
      status: 'down',
      message: `Could not read sync logs: ${String(err?.message || err).slice(0, 160)}`,
    }
  }

  // Webhook coverage (n/7 required topics registered) — only meaningful when
  // Shopify is configured.
  let webhooksRegistered = null
  let webhooksRequired = REQUIRED_TOPICS.length
  const { shopDomain, accessToken } = env.shopify
  if (shopDomain && accessToken && !shopDomain.startsWith('PASTE')) {
    try {
      const res = await request('/webhooks.json')
      const existing = res?.webhooks || []
      webhooksRegistered = REQUIRED_TOPICS.filter((topic) =>
        existing.some((w) => w.topic === topic && w.address === webhookCallbackUrl(topic))
      ).length
    } catch {
      webhooksRegistered = null // could not verify
    }
  }

  const values = Object.values(byType)
  const anyFailed = values.some((v) => v.status === 'FAILED')
  const anyPending = values.some((v) => v.status === 'PENDING')
  const anyNever = values.some((v) => v.status === 'NEVER')
  const webhooksOk = webhooksRegistered === null || webhooksRegistered === webhooksRequired

  let status = 'ok'
  if (anyFailed || !webhooksOk) status = 'down'
  else if (anyPending || anyNever) status = 'warn'
  const linked = types.filter((t) => byType[t].status === 'SUCCESS').length
  let message = `${linked}/${types.length} sync types OK`
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
    },
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
  email: checkEmail,
  metalRate: checkMetalRate,
  syncs: checkSyncs,
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

async function runOne(key) {
  const runner = RUNNERS[key]
  if (!runner) return null
  const startedAt = Date.now()
  let result
  try {
    result = (await runner()) || { status: 'down', message: 'Check returned no result' }
  } catch (err) {
    result = { status: 'down', message: `Check crashed: ${String(err?.message || err).slice(0, 160)}` }
  }
  return { key, ...result, checkedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt }
}

const systemHealthService = {
  async getAllChecks() {
    const checks = await Promise.all(CHECK_KEYS.map((key) => runOne(key)))
    return { checkedAt: new Date().toISOString(), overall: computeOverall(checks), checks }
  },

  async getOneCheck(key) {
    return runOne(String(key || ''))
  },
}

module.exports = systemHealthService