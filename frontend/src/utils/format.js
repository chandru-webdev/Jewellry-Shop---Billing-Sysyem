export function formatINR(n) {
  if (n === null || n === undefined) return '—'
  const num = typeof n === 'number' ? n : Number(n)
  if (Number.isNaN(num)) return '—'
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatWeight(n) {
  if (n === null || n === undefined) return '—'
  return `${n} g`
}

export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatShortINR(n) {
  if (n === null || n === undefined) return '—'
  const num = typeof n === 'number' ? n : Number(n)
  if (Number.isNaN(num)) return '—'
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`
  return '₹' + num.toFixed(2)
}
