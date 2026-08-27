const { test } = require('node:test')
const assert = require('node:assert')

// Test the CSV generation logic directly (extracted from export.service.js pattern)
function toCsvRow(values) {
  return values.map((v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }).join(',')
}

function toCsvString(headers, rows) {
  return [headers.join(','), ...rows.map(toCsvRow)].join('\n')
}

test('toCsvRow joins values with commas', () => {
  assert.strictEqual(toCsvRow([1, 'hello', 3.14]), '1,hello,3.14')
})

test('toCsvRow handles null/undefined as empty', () => {
  assert.strictEqual(toCsvRow([null, undefined, '']), ',,')
})

test('toCsvRow double-quotes values containing commas', () => {
  assert.strictEqual(toCsvRow(['Mumbai, India']), '"Mumbai, India"')
})

test('toCsvRow escapes double quotes inside values', () => {
  assert.strictEqual(toCsvRow(['He said "hello"']), '"He said ""hello"""')
})

test('toCsvRow double-quotes values containing newlines', () => {
  assert.strictEqual(toCsvRow(['line1\nline2']), '"line1\nline2"')
})

test('toCsvString produces header + rows', () => {
  const csv = toCsvString(['id', 'name'], [[1, 'Alice'], [2, 'Bob']])
  const lines = csv.split('\n')
  assert.strictEqual(lines[0], 'id,name')
  assert.strictEqual(lines[1], '1,Alice')
  assert.strictEqual(lines[2], '2,Bob')
})

test('toCsvString handles empty rows', () => {
  const csv = toCsvString(['id', 'name'], [])
  assert.strictEqual(csv, 'id,name')
})

test('toCsvString handles mixed types', () => {
  const csv = toCsvString(['month', 'revenue', 'orders'], [['2026-01', 100000.50, 50]])
  assert.strictEqual(csv, 'month,revenue,orders\n2026-01,100000.5,50')
})

test('sales aggregation groups by month correctly', () => {
  const invoices = [
    { totalAmount: 100, createdAt: new Date('2026-01-15') },
    { totalAmount: 200, createdAt: new Date('2026-01-20') },
    { totalAmount: 150, createdAt: new Date('2026-02-10') },
  ]
  const byMonth = {}
  for (const inv of invoices) {
    const d = inv.createdAt
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { revenue: 0, orders: 0 }
    byMonth[key].revenue += Number(inv.totalAmount) || 0
    byMonth[key].orders++
  }
  assert.strictEqual(byMonth['2026-01'].revenue, 300)
  assert.strictEqual(byMonth['2026-01'].orders, 2)
  assert.strictEqual(byMonth['2026-02'].revenue, 150)
  assert.strictEqual(byMonth['2026-02'].orders, 1)
})

test('GST aggregation calculates totals per period', () => {
  const invoices = [
    { totalAmount: 1000, cgstAmount: 45, sgstAmount: 45, createdAt: new Date('2026-07-05') },
    { totalAmount: 2000, cgstAmount: 90, sgstAmount: 90, createdAt: new Date('2026-07-20') },
    { totalAmount: 500, cgstAmount: 22.5, sgstAmount: 22.5, createdAt: new Date('2026-08-01') },
  ]
  const byPeriod = {}
  for (const inv of invoices) {
    const d = inv.createdAt
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byPeriod[key]) byPeriod[key] = { taxable: 0, cgst: 0, sgst: 0 }
    byPeriod[key].taxable += Number(inv.totalAmount) || 0
    byPeriod[key].cgst += Number(inv.cgstAmount) || 0
    byPeriod[key].sgst += Number(inv.sgstAmount) || 0
  }
  assert.strictEqual(byPeriod['2026-07'].taxable, 3000)
  assert.strictEqual(byPeriod['2026-07'].cgst, 135)
  assert.strictEqual(byPeriod['2026-08'].taxable, 500)
  assert.strictEqual(byPeriod['2026-08'].cgst + byPeriod['2026-08'].sgst, 45)
})
