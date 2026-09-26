const prisma = require('../prisma/client')
const systemHealthService = require('./systemHealth.service')
const notificationService = require('./notification.service')

// Background monitor: runs the System Health checks periodically and sends an
// in-app notification to admins whenever a check transitions into a problem
// state (and once when it recovers).
//
// Last-known states are persisted in the Setting table so:
//  - a restart doesn't re-alert for an already-reported incident, and
//  - multiple instances/replicas share the same transition history.
//
// NOTE: Railway sleeps the app when idle, so the interval only fires while the
// process is awake. A fresh pass also runs shortly after every boot, which
// covers the sleep->wake case. Only one alert is created per incident —
// a check that stays down won't re-notify every interval.

const SETTING_KEY = 'systemHealthMonitor'
const INTERVAL_MS = 10 * 60 * 1000 // every 10 minutes while awake

// Human-readable names for the alert titles (checks carry no label).
const CHECK_LABELS = {
  api: 'API Server',
  database: 'Database',
  shopify: 'Shopify API',
  storefront: 'Storefront',
  email: 'Email (SMTP)',
  metalRate: 'Silver Rate Source',
  syncs: 'Sync Status',
  errors: 'Last 24h Errors',
  stuck: 'Stuck Sync Jobs',
  testData: 'Test Data',
  env: 'Environment Secrets',
}

// Checks that commonly sit at "warn" by design (e.g. SMTP not configured on
// Railway). Alerting on their warn state would spam admins on every boot, so
// we only ever alert those keys when they go fully down.
const WARN_NOISE_KEYS = new Set(['email'])

function labelFor(key) {
  return CHECK_LABELS[key] || key
}

function buildNotification(kind, check, previousStatus) {
  const label = labelFor(check.key)
  const message = systemHealthService.sanitizeError(check.message, 300)

  if (kind === 'down') {
    return {
      type: 'SYSTEM_DOWN',
      title: `${label} check down`,
      message: `${message}. Open System Health for details.`,
    }
  }
  if (kind === 'degraded') {
    return {
      type: 'SYSTEM_DEGRADED',
      title: `${label} check degraded`,
      message: `${message}. Open System Health for details.`,
    }
  }
  return {
    type: 'SYSTEM_RECOVERED',
    title: `${label} check recovered`,
    message: `Back to normal (was ${previousStatus}).`,
  }
}

// Pure transition logic — unit-tested. `previous` is the persisted state map
// ({ key: { status, alerted } }), `checks` the array from getAllChecks().
// Returns { alerts, next } where next is the state map to persist.
function computeAlerts(previous, checks) {
  const alerts = []
  const next = {}

  for (const check of checks) {
    const { key, status } = check
    const prev = previous[key]

    // Never seen this key before. A full boot is the slowest a service ever
    // runs (cold start), so only a hard "down" is certain enough to alert on;
    // warnings on the very first pass are silently learned as baseline.
    if (!prev) {
      next[key] = { status, alerted: status === 'down' }
      if (status === 'down') {
        alerts.push({ kind: 'down', key, status, message: check.message, previous: null })
      }
      continue
    }

    if (prev.status === status) {
      next[key] = prev
      continue
    }

    next[key] = { status, alerted: false }

    if (status === 'down') {
      next[key].alerted = true
      alerts.push({ kind: 'down', key, status, message: check.message, previous: prev.status })
    } else if (status === 'warn' && !WARN_NOISE_KEYS.has(key)) {
      next[key].alerted = true
      alerts.push({ kind: 'degraded', key, status, message: check.message, previous: prev.status })
    } else if (status === 'ok' && prev.alerted) {
      alerts.push({ kind: 'recovered', key, status, previous: prev.status })
    }
  }

  return { alerts, next }
}

async function loadState() {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
      select: { value: true },
    })
    return (row?.value && typeof row.value === 'object') ? row.value : {}
  } catch {
    return {}
  }
}

async function saveState(state) {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: state },
    create: { key: SETTING_KEY, value: state },
  })
}

// Run one monitoring pass: probe all checks, compare with the persisted state,
// notify admins about transitions, persist the new state. Never throws — a
// monitor failure is logged and left for the next pass.
async function runOnce() {
  try {
    const [previous, { checks }] = await Promise.all([
      loadState(),
      systemHealthService.getAllChecks(),
    ])

    const { alerts, next } = computeAlerts(previous, checks)

    for (const alert of alerts) {
      const { type, title, message } = buildNotification(alert.kind, alert, alert.previous)
      await notificationService.createForAdmins({ type, title, message })
      console.log(`[HEALTH MONITOR] ${type}: ${title}`)
    }

    await saveState(next)
  } catch (err) {
    console.error('[HEALTH MONITOR] Pass failed:', err?.message)
  }
}

let running = false

// Start the monitor: one pass a few seconds after boot (covers sleep->wake),
// then on the interval. The interval is unref'd so it never keeps a process
// alive by itself.
function start({ intervalMs = INTERVAL_MS } = {}) {
  setTimeout(() => {
    if (running) return
    running = true
    runOnce().finally(() => {
      running = false
    })
  }, 5000)

  const timer = setInterval(() => {
    if (running) return
    running = true
    runOnce().finally(() => {
      running = false
    })
  }, intervalMs)
  timer.unref?.()
}

module.exports = {
  computeAlerts,
  buildNotification,
  runOnce,
  start,
  SETTING_KEY,
  CHECK_LABELS,
  WARN_NOISE_KEYS,
}