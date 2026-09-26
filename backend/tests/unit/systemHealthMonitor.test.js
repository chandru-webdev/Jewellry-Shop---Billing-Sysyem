const { test } = require('node:test')
const assert = require('node:assert')
const { computeAlerts, buildNotification } = require('../../src/services/systemHealthMonitor.service')

const OK = 'ok'
const WARN = 'warn'
const DOWN = 'down'

function check(key, status, message = '') {
  return { key, status, message }
}

test('first-ever pass: ok/warn states are learned silently, down is alerted', () => {
  const { alerts, next } = computeAlerts({}, [
    check('api', OK, 'API responding'),
    check('email', WARN, 'SMTP not configured'),
    check('database', DOWN, 'Connection refused'),
  ])
  assert.deepStrictEqual(alerts.map((a) => a.kind), ['down'])
  assert.strictEqual(next.api.alerted, false)
  assert.strictEqual(next.email.alerted, false)
  assert.strictEqual(next.database.alerted, true)
})

test('steady state: no repeated alerts while a check stays down', () => {
  const previous = { database: { status: DOWN, alerted: true } }
  const { alerts, next } = computeAlerts(previous, [check('database', DOWN, 'still down')])
  assert.deepStrictEqual(alerts, [])
  assert.deepStrictEqual(next.database, previous.database)
})

test('transition to down alerts exactly once and marks alerted', () => {
  const previous = { api: { status: OK, alerted: false } }
  const { alerts, next } = computeAlerts(previous, [check('api', DOWN, 'Health probe returned HTTP 500')])
  assert.strictEqual(alerts.length, 1)
  assert.strictEqual(alerts[0].kind, 'down')
  assert.strictEqual(alerts[0].previous, OK)
  assert.strictEqual(next.api.alerted, true)
})

test('non-noise warn transition alerts as degraded', () => {
  const previous = { syncs: { status: OK, alerted: false } }
  const { alerts, next } = computeAlerts(previous, [check('syncs', WARN, '3 of 7 webhooks registered')])
  assert.strictEqual(alerts.length, 1)
  assert.strictEqual(alerts[0].kind, 'degraded')
  assert.strictEqual(next.syncs.alerted, true)
})

test('email warn (chronic, noise) never alerts and never marks alerted', () => {
  const previous = { email: { status: OK, alerted: false } }
  const { alerts, next } = computeAlerts(previous, [check('email', WARN, 'SMTP not configured')])
  assert.deepStrictEqual(alerts, [])
  assert.strictEqual(next.email.alerted, false)
})

test('email going down still alerts', () => {
  const previous = { email: { status: WARN, alerted: false } }
  const { alerts, next } = computeAlerts(previous, [check('email', DOWN, 'SMTP timeout')])
  assert.strictEqual(alerts.length, 1)
  assert.strictEqual(alerts[0].kind, 'down')
  assert.strictEqual(next.email.alerted, true)
})

test('recovery alerts only when the incident had been reported', () => {
  const previous = { database: { status: DOWN, alerted: true }, email: { status: WARN, alerted: false } }
  const { alerts, next } = computeAlerts(previous, [
    check('database', OK, 'Database reachable'),
    check('email', OK, 'SMTP reachable'),
  ])
  assert.strictEqual(alerts.length, 1)
  assert.strictEqual(alerts[0].kind, 'recovered')
  assert.strictEqual(alerts[0].key, 'database')
  assert.strictEqual(next.database.alerted, false)
})

test('down -> warn keeps alerting as degraded (not a duplicate down)', () => {
  const previous = { syncs: { status: DOWN, alerted: true } }
  const { alerts, next } = computeAlerts(previous, [check('syncs', WARN, 'still partial')])
  assert.strictEqual(alerts.length, 1)
  assert.strictEqual(alerts[0].kind, 'degraded')
  assert.strictEqual(next.syncs.alerted, true)
})

test('unknown checks are ignored and unknown keys fall back to the key as label', () => {
  const { alerts } = computeAlerts({}, [check('futureCheck', DOWN, 'boom')])
  assert.strictEqual(alerts[0].key, 'futureCheck')
  const n = buildNotification({ kind: 'down' }, check('futureCheck', DOWN, 'boom'), null)
  assert.match(n.title, /futureCheck/)
})

test('alert messages are scrubbed and truncated', () => {
  const n = buildNotification({ kind: 'down' }, check('api', DOWN, `auth failed? access_token=sekrit&x=${'y'.repeat(900)}`), null)
  assert.ok(!n.message.includes('sekrit'))
  assert.ok(n.message.length <= 300)
})