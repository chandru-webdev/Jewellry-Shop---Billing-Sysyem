// Three-tier stock status classification shared by reports and the dashboard.
//
//   qty === 0           -> OUT_OF_STOCK
//   qty <= threshold    -> LOW_STOCK     (a product at exactly its threshold
//                                         is still low, so warn — never hide)
//   otherwise           -> IN_STOCK
//
// Pure function (no DB) so the exact boundary rules are unit-testable.
function stockStatus(qty, threshold = 5) {
  const q = Number(qty ?? 0)
  const t = Number(threshold ?? 5)

  if (q <= 0) return 'OUT_OF_STOCK'
  if (q <= t) return 'LOW_STOCK'
  return 'IN_STOCK'
}

module.exports = { stockStatus }