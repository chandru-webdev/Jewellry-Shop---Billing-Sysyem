// Shared helpers for showing per-product Shopify sync state across the UI.

export function timeAgo(value) {
  if (!value) return ''
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Derive a single, human-readable sync state from an ERP product record.
// Tone maps to Badge tones: green | red | orange | gray.
export function productSyncState(product) {
  if (!product) {
    return { tone: 'gray', label: 'No ERP match', detail: 'No matching ERP product for this SKU' }
  }
  if (product.pushToShopify === false) {
    return { tone: 'gray', label: 'Not pushed', detail: 'Marked as “do not push to Shopify”' }
  }
  if (product.shopifyLastSyncError) {
    return { tone: 'red', label: 'Sync failed', detail: product.shopifyLastSyncError }
  }
  if (product.shopifyProductId) {
    return {
      tone: 'green',
      label: 'Synced',
      detail: product.shopifyLastSyncedAt ? `Last synced ${timeAgo(product.shopifyLastSyncedAt)}` : 'Linked to Shopify',
    }
  }
  if (product.isActive === false) {
    return { tone: 'gray', label: 'Inactive', detail: 'Inactive — not pushed to Shopify' }
  }
  return { tone: 'orange', label: 'Not synced', detail: 'Active but never pushed to Shopify' }
}

// A product needs attention when it should be on Shopify but is not, or it
// failed its last sync.
export function needsAttention(product) {
  if (!product) return false
  if (product.shopifyLastSyncError) return true
  if (product.pushToShopify === false) return false
  if (product.isActive === false) return false
  return !product.shopifyProductId
}
