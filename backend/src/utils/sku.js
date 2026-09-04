// SKU format: uppercase letters, optional subcategory hyphen, then 3+ digits.
// Examples: SLR-001, SLV-RNG-00001, OL-RNG-001
const SKU_PATTERN = /^[A-Z]{2,}(?:-[A-Z]{2,})?-\d{3,}$/

// Normalize a raw SKU: trim, uppercase, ensure pattern compliance.
function normalizeSKU(raw) {
  if (!raw) return ''
  let s = String(raw).trim().toUpperCase()
  // If already pattern-compliant, keep as-is.
  if (SKU_PATTERN.test(s)) return s
  // Try to extract a prefix + digits suffix.
  const match = s.match(/^([A-Z.-]+)?(\d+)$/)
  if (match) {
    const prefix = (match[1] || '').replace(/[^A-Z]/g, '').toUpperCase() || 'SLR'
    return `${prefix}-${match[2]}`
  }
  // Fallback: just uppercase and ensure it ends with 3 digits.
  const digits = s.replace(/[^0-9]/g, '')
  if (digits.length >= 3) return `${s.replace(/\D/g, '')}-${digits.slice(-3)}`
  return `SLR-${s.padEnd(3, '0').slice(-3)}`
}

module.exports = { normalizeSKU, SKU_PATTERN }
