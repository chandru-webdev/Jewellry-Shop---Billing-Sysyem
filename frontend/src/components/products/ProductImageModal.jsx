import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Input } from '../ui/FormControls'
import { Plus, X } from 'lucide-react'

const toList = (product) => {
  const base = Array.isArray(product?.imageUrls) && product.imageUrls.length
    ? product.imageUrls
    : product?.shopifyImageUrl
      ? [product.shopifyImageUrl]
      : []
  return base.filter(Boolean)
}

export default function ProductImageModal({ open, onClose, product, onSave, submitting }) {
  const [urls, setUrls] = useState(() => toList(product))
  const [error, setError] = useState('')
  if (!product) return null

  const validUrl = (v) => /^https?:\/\/.+/.test(v.trim())

  const setUrlAt = (i, v) => setUrls((cur) => cur.map((u, j) => (j === i ? v : u)))
  const removeAt = (i) => setUrls((cur) => cur.filter((_, j) => j !== i))
  const addEmpty = () => setUrls((cur) => [...cur, ''])

  const handleSave = (e) => {
    e.preventDefault()
    const cleaned = urls.map((u) => u.trim()).filter(Boolean)
    if (cleaned.some((u) => !validUrl(u))) {
      setError('Every image must be an http(s) URL. Remove empty or invalid entries.')
      return
    }
    onSave(cleaned)
  }

  return (
    <Modal
      open={open}
      title={`Images — ${product.name}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="product-image-form" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Images'}
          </Button>
        </>
      }
    >
      <form id="product-image-form" onSubmit={handleSave} className="space-y-4">
        {(urls.length > 0 || product.shopifyImageUrl) && (
          <div className="flex flex-wrap gap-2">
            {urls.filter(Boolean).map((u, i) => (
              <img key={`${u}-${i}`} src={u} alt={`product ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-white/10" onError={(e) => { e.currentTarget.style.opacity = 0.25 }} />
            ))}
          </div>
        )}

        <div className="space-y-2">
          {urls.map((u, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={u} onChange={(e) => setUrlAt(i, e.target.value)} placeholder={`Image URL ${i + 1} — https://...`} className="flex-1" />
              <button type="button" onClick={() => removeAt(i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer" title="Remove image">
                <X size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addEmpty} className="flex items-center gap-1 text-xs font-medium text-royal-600 dark:text-royal-400 hover:underline cursor-pointer">
            <Plus size={14} /> Add another image
          </button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-[11px] text-gray-400">
          Paste public image URLs. All URLs are stored in the database, shown in the product view, and pushed to Shopify.
        </p>
      </form>
    </Modal>
  )
}