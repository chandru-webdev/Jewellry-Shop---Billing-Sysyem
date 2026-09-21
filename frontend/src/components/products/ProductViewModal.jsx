import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, ExternalLink, Copy, Power, Package, Check, X, History, Film, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatINR, formatWeight, formatDateTime } from '../../utils/format'

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-2 gap-3 py-1.5 text-sm border-b border-gray-50 dark:border-white/5 last:border-0">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium text-gray-800 dark:text-gray-200 truncate" title={value}>
        {value || '—'}
      </span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-royal-700 dark:text-royal-400 mb-1.5">{title}</h4>
      <div>{children}</div>
    </div>
  )
}

export default function ProductViewModal({ open, onClose, product, shopDomain, onEdit, onDuplicate, onDeactivate, onAdjustStock, submitting }) {
  const [adjustStock, setAdjustStock] = useState(null)
  const [stockValue, setStockValue] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  if (!product) return null
  const inv = product.inventory
  const qty = inv?.quantity ?? 0
  const threshold = product.lowStockThreshold || 5
  const stockTone = qty > threshold ? 'green' : qty > 0 ? 'orange' : 'red'
  const mediaUrls = (Array.isArray(product.imageUrls) && product.imageUrls.length
    ? product.imageUrls
    : product.shopifyImageUrl
      ? [product.shopifyImageUrl]
      : []).filter(Boolean).filter((url, i, arr) => arr.indexOf(url) === i)
  const isVideo = (url) => /\.(mp4|webm|mov)$/i.test(url.split('?')[0])
  const shopHandle = shopDomain?.replace(/\.myshopify\.com$/, '')
  const shopifyUrl = product.shopifyProductId && shopHandle
    ? `https://admin.shopify.com/store/${shopHandle}/products/${product.shopifyProductId}`
    : null
  const startAdjustStock = () => {
    setStockValue(String(qty))
    setAdjustStock(true)
  }
  const confirmAdjustStock = () => {
    const val = parseInt(stockValue, 10)
    if (Number.isNaN(val) || val < 0) return
    onAdjustStock?.(product, val)
    setAdjustStock(false)
  }

  return (
    <>
      <Modal open={open} title={product.name} onClose={onClose} size="2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <div className="text-[11px] text-gray-400">
            Created {product.createdAt ? formatDateTime(product.createdAt) : '—'} · Updated {product.updatedAt ? formatDateTime(product.updatedAt) : '—'}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit?.(product)}><Pencil size={14} /> Edit</Button>
            <Button variant="outline" size="sm" onClick={() => onDuplicate?.(product)} loading={submitting === 'duplicate'}><Copy size={14} /> Duplicate</Button>
            <Button variant="outline" size="sm" onClick={startAdjustStock}><Package size={14} /> Adjust Stock</Button>
            <Button variant="outline" size="sm" className={product.isActive ? 'text-red-600 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'}
              onClick={() => onDeactivate?.(product)} loading={submitting === 'deactivate'}>
              <Power size={14} /> {product.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      }
    >
      {mediaUrls.length > 0 ? (
        <div className="flex flex-wrap gap-3 mb-6">
          {mediaUrls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative w-24 h-24 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 overflow-hidden cursor-zoom-in"
              onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
              title="Click to enlarge"
            >
              {isVideo(url) ? (
                <>
                  <video src={url} muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 right-1 p-1 bg-black/60 text-white rounded text-[9px]"><Film size={10} /></div>
                </>
              ) : (
                <img src={url} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
              )}
              <div className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"><Maximize2 size={12} /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="w-24 h-24 rounded-xl border border-dashed border-gray-300 dark:border-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs mb-6">
          No media
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Badge tone={product.isActive ? 'green' : 'gray'}>{product.isActive ? 'Active' : 'Inactive'}</Badge>
        <Badge tone={product.shopifyProductId ? 'blue' : 'orange'}>{product.shopifyProductId ? 'Synced to Shopify' : 'Pending'}</Badge>
        {onEdit && (
          <button onClick={() => onEdit(product)} className="ml-auto p-1.5 text-gray-500 dark:text-gray-400 hover:text-royal-600 hover:bg-royal-50 dark:hover:bg-white/10 rounded-lg cursor-pointer" title="Edit">
            <Pencil size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <Section title="Basic Details">
          <Row label="SKU" value={product.sku} />
          <Row label="Barcode" value={product.barcode} />
          <Row label="Category" value={product.category?.name} />
          <Row label="Collection" value={product.collection?.name} />
          <Row label="Supplier" value={product.supplier?.name} />
          <Row label="Purity" value={product.purity ? `${product.purity}%` : undefined} />
        </Section>

        <Section title="Weight">
          <Row label="Gross weight" value={formatWeight(product.grossWeight)} />
          <Row label="Stone weight" value={formatWeight(product.stoneWeight)} />
          <Row label="Net weight" value={formatWeight(product.netWeight ?? product.weight)} />
        </Section>

        <Section title="Pricing">
          <Row label="Silver rate used" value={product.silverRateUsed ? `${formatINR(product.silverRateUsed)}/g` : undefined} />
          <Row label="Making charge" value={product.makingCharge ? `${formatINR(product.makingCharge)}/g` : undefined} />
          <Row label="GST" value={product.gstPercent ? `${product.gstPercent}%` : undefined} />
          <Row label="Base amount" value={formatINR(product.baseAmount)} />
          <Row label="GST amount" value={formatINR(product.gstAmount)} />
          <Row label="Selling price" value={formatINR(product.sellingPrice)} />
          <Row label="Compare-at price" value={formatINR(product.compareAtPrice)} />
          <Row label="Cost price" value={formatINR(product.costPrice)} />
        </Section>

        <div className="space-y-5">
          <Section title="Stock">
            <div className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 dark:border-white/5">
              <span className="text-gray-500 dark:text-gray-400">In stock</span>
              {adjustStock ? (
                <div className="flex items-center gap-1.5">
                  <input type="number" min="0" step="1" value={stockValue} onChange={(e) => setStockValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmAdjustStock(); if (e.key === 'Escape') setAdjustStock(false) }}
                    className="w-24 text-right text-sm border border-royal-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-royal-500" autoFocus />
                  <button onClick={confirmAdjustStock} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"><Check size={13} /></button>
                  <button onClick={() => setAdjustStock(false)} className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"><X size={13} /></button>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <Badge tone={stockTone}>{qty} pcs</Badge>
                  {onAdjustStock && (
                    <button onClick={startAdjustStock} className="p-1 text-gray-400 hover:text-royal-600 rounded cursor-pointer" title="Adjust stock">
                      <Package size={13} />
                    </button>
                  )}
                </span>
              )}
            </div>
            <Row label="Low stock threshold" value={threshold} />
          </Section>

          <Section title="Shopify">
            <div className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 dark:border-white/5 last:border-0">
              <span className="text-gray-500 dark:text-gray-400">Product ID</span>
              {shopifyUrl ? (
                <a href={shopifyUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-royal-700 dark:text-royal-300 hover:underline">
                  {product.shopifyProductId?.toString()} <ExternalLink size={13} />
                </a>
              ) : (
                <span className="font-medium text-gray-800 dark:text-gray-200">{product.shopifyProductId?.toString() || '—'}</span>
              )}
            </div>
            <Row label="Variant ID" value={product.shopifyVariantId?.toString()} />
            <Row label="Vendor" value={product.shopifyVendor} />
            <Row label="Type" value={product.shopifyProductType} />
            <Row label="Tags" value={product.shopifyTags} />
            <Row label="Media" value={mediaUrls.length ? `${mediaUrls.length} item(s)` : undefined} />
            <Row label="Track inventory" value={product.trackInventory ? 'Yes' : 'No'} />
          </Section>
        </div>
      </div>

      {product.description && (
        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-royal-700 dark:text-royal-400 mb-1.5">Description</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">{product.description}</p>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5">
        <Link to={`/price-history?product=${product.id}&name=${encodeURIComponent(product.name)}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-700 dark:text-royal-300 hover:underline">
          <History size={15} /> View Price History <span aria-hidden>→</span>
        </Link>
      </div>
    </Modal>

    {lightboxOpen && (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
        <div className="relative w-full h-full max-w-5xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 text-white rounded-full hover:bg-white/20"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          {mediaUrls.length > 1 && (
            <>
              <button
                onClick={() => setLightboxIndex((i) => (i - 1 + mediaUrls.length) % mediaUrls.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/10 text-white rounded-full hover:bg-white/20"
                aria-label="Previous"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={() => setLightboxIndex((i) => (i + 1) % mediaUrls.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/10 text-white rounded-full hover:bg-white/20"
                aria-label="Next"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
          {isVideo(mediaUrls[lightboxIndex]) ? (
            <video
              src={mediaUrls[lightboxIndex]}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={mediaUrls[lightboxIndex]}
              alt={`${product.name} ${lightboxIndex + 1}`}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>
    )}
    </>
  )
}