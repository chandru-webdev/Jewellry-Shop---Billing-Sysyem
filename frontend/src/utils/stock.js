// Shared inventory status labels for the frontend.
// Mirrors backend/src/utils/stockStatus.js boundary rules:
//   qty === 0        -> Out of Stock
//   qty <= threshold -> Low Stock
//   otherwise        -> In Stock
export function stockStatus(qty, threshold = 5) {
  const q = Number(qty ?? 0)
  const t = Number(threshold ?? 5)

  if (q <= 0) return 'Out of Stock'
  if (q <= t) return 'Low Stock'
  return 'In Stock'
}

export const stockStatusTone = {
  'In Stock': 'green',
  'Low Stock': 'orange',
  'Out of Stock': 'red',
}