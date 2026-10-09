// Shared customer-matching helpers used by the Shopify webhook processor and
// the Shopify customer pull. Kept dependency-free (no Prisma) so both DB-write
// paths and unit tests can use them.

// Single phone reserved for the shared "Guest" customer that catches orders
// whose customer details Shopify redacted (guest checkout, no email, no phone).
const GUEST_PHONE = 'GUEST'

// Canonicalise a phone number so the same customer matches regardless of
// formatting: strip spaces, dashes and brackets, then drop the +91 / 91 / 0
// prefix. "+91 98765 43210", "91-98765-43210", "09876543210" and "9876543210"
// all become "9876543210". Returns null when there are no digits at all.
function normalizePhone(input) {
  if (input == null) return null
  let digits = String(input).replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

// Canonicalise an email for comparison (trim + lowercase). Returns null for an
// empty/whitespace value so it never matches another blank.
function normalizeEmail(input) {
  if (input == null) return null
  const trimmed = String(input).trim().toLowerCase()
  return trimmed || null
}

// Pick the existing customer an incoming order belongs to. Priority mirrors the
// requirement: Shopify customer id, then email (case-insensitive), then
// normalised phone. Returns null when nothing matches (caller then creates).
function pickCustomerMatch(candidates, { shopifyCustomerId, email, phone }) {
  const list = Array.isArray(candidates) ? candidates : []
  if (shopifyCustomerId != null) {
    const byId = list.find(
      (c) => c.shopifyCustomerId != null && String(c.shopifyCustomerId) === String(shopifyCustomerId)
    )
    if (byId) return byId
  }
  if (email) {
    const byEmail = list.find((c) => normalizeEmail(c.email) === email)
    if (byEmail) return byEmail
  }
  if (phone) {
    const byPhone = list.find((c) => normalizePhone(c.phone) === phone)
    if (byPhone) return byPhone
  }
  return null
}

function isUniqueConstraintError(err) {
  return Boolean(err) && (err.code === 'P2002' || (err.meta && err.meta.target))
}

module.exports = {
  GUEST_PHONE,
  normalizePhone,
  normalizeEmail,
  pickCustomerMatch,
  isUniqueConstraintError,
}
