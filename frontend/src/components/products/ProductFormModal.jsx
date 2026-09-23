import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Input, Select, Label, Textarea } from '../ui/FormControls'
import { Plus, X, Lock, Upload } from 'lucide-react'
import { formatINR } from '../../utils/format'
import apiClient from '../../api/client'

// Real ERP SKUs look like SLR-001 / SLV-RNG-00001 (letters, hyphen, digits).
const SKU_PATTERN = /^[A-Z]{2,}(?:-[A-Z]{2,})?-\d{3,}$/

const toNum = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v))
const round3 = (x) => Math.round((x + Number.EPSILON) * 1000) / 1000
const numOr = (v, d) => {
  const n = toNum(v)
  return Number.isNaN(n) ? d : n
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-royal-600' : 'bg-gray-300 dark:bg-white/15'} disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </div>
  )
}

const emptyForm = {
  sku: '',
  name: '',
  categoryId: '',
  collectionId: '',
  supplierId: '',
  barcode: '',
  purity: '92.5',
  colour: '',
  description: '',
  grossWeight: '',
  stoneWeight: '',
  netWeight: '',
  stoneType: '',
  stonePieces: '',
  stoneValue: '',
  silverRateUsed: '',
  makingCharge: '20',
  gstPercent: '3',
  compareAtPrice: '',
  costPrice: '',
  initialStock: '0',
  shopifyVendor: 'Opal Line',
  shopifyProductType: '',
  shopifyTags: '',
  shopifyMedia: [{ type: 'image', url: '' }],
  shopifyStatus: 'active',
  chargeTax: true,
  trackInventory: true,
  pushToShopify: true,
}

function buildForm(product, silverRate) {
  if (!product) {
    return { ...emptyForm, silverRateUsed: silverRate != null && silverRate !== '' ? String(silverRate) : '' }
  }
  const weight = Number(product.netWeight ?? product.weight ?? 0)
  return {
    sku: product.sku,
    name: product.name,
    categoryId: String(product.categoryId ?? ''),
    collectionId: product.collectionId ? String(product.collectionId) : '',
    supplierId: product.supplierId ? String(product.supplierId) : '',
    barcode: product.barcode || '',
    purity: String(product.purity ?? 92.5),
    colour: product.colour || '',
    description: product.description || '',
    grossWeight: product.grossWeight != null ? String(product.grossWeight) : String(weight),
    stoneWeight: product.stoneWeight != null ? String(product.stoneWeight) : '0',
    netWeight: weight ? String(weight) : '',
    stoneType: product.stoneType || '',
    stonePieces: product.stonePieces != null ? String(product.stonePieces) : '',
    stoneValue: product.stoneValue != null ? String(product.stoneValue) : '',
    silverRateUsed: silverRate != null && silverRate !== '' ? String(silverRate) : (product.silverRateUsed != null ? String(product.silverRateUsed) : ''),
    makingCharge: String(product.makingCharge ?? 20),
    gstPercent: String(product.gstPercent ?? 3),
    compareAtPrice: product.compareAtPrice != null ? String(product.compareAtPrice) : '',
    costPrice: product.costPrice != null ? String(product.costPrice) : '',
    initialStock: String(product.inventory?.quantity ?? 0),
    shopifyVendor: product.shopifyVendor || 'Opal Line',
    shopifyProductType: product.shopifyProductType || '',
    shopifyTags: product.shopifyTags || '',
    shopifyMedia: Array.isArray(product.imageUrls) && product.imageUrls.length
      ? product.imageUrls.filter(Boolean).map(u => ({ type: 'image', url: u }))
      : product.shopifyImageUrl
        ? [{ type: 'image', url: product.shopifyImageUrl }]
        : [{ type: 'image', url: '' }],
    shopifyStatus: product.shopifyStatus || 'active',
    chargeTax: product.chargeTax !== false,
    trackInventory: product.trackInventory !== false,
    pushToShopify: product.pushToShopify !== false,
  }
}

export default function ProductFormModal({
  open,
  onClose,
  onSubmit,
  product,
  categories,
  collections,
  suppliers,
  silverRate,
  submitting,
  existingSkus = [],
  submitError = '',
}) {
  const [form, setForm] = useState(() => buildForm(product, silverRate))
  const [skuError, setSkuError] = useState('')
  const [barcodeError, setBarcodeError] = useState('')
  const [netManual, setNetManual] = useState(false)
  // Manual selling-price override. When empty, the backend auto-calculates the price
  // from net weight × (silver rate + making charge) + stone value, then + GST%.
  // Pre-filled only when the stored price was deliberately set by hand (it differs
  // from what the formula would produce at the stored rate), so a manual price
  // survives editing other fields.
  const [priceOverride, setPriceOverride] = useState(() => {
    if (!product) return ''
    const storedPrice = Number(product.sellingPrice ?? 0)
    if (!storedPrice) return ''
    const rate = Number(product.silverRateUsed ?? 0) > 0 ? Number(product.silverRateUsed) : Number(silverRate ?? 0)
    const net = Number(product.netWeight ?? product.weight ?? 0) || 0
    const making = Number(product.makingCharge ?? 0) || 0
    const gst = Number(product.gstPercent ?? 3) || 0
    const stone = Number(product.stoneValue ?? 0) || 0
    const base = net * (rate + making) + stone
    const expected = base + (base * gst) / 100
    return Math.abs(expected - storedPrice) > 0.01 ? String(storedPrice) : ''
  })
  const isEdit = Boolean(product)

  const set = (field) => (e) => {
    const value = e.target.value
    setForm({ ...form, [field]: value })
    if (field === 'sku') setSkuError('')
    if (field === 'barcode') setBarcodeError('')
  }

  const autoNet = () => {
    const g = numOr(form.grossWeight, 0)
    const s = numOr(form.stoneWeight, 0)
    return String(round3(Math.max(0, g - s)))
  }

  const onGrossChange = (e) => {
    setForm({ ...form, grossWeight: e.target.value, ...(!netManual ? { netWeight: '' } : {}) })
    if (!netManual) {
      const g = numOr(e.target.value, 0)
      const s = numOr(form.stoneWeight, 0)
      setForm((cur) => ({ ...cur, grossWeight: e.target.value, netWeight: String(round3(Math.max(0, g - s))) }))
    }
  }

  const onStoneChange = (e) => {
    if (!netManual) {
      const g = numOr(form.grossWeight, 0)
      const s = numOr(e.target.value, 0)
      setForm((cur) => ({ ...cur, stoneWeight: e.target.value, netWeight: String(round3(Math.max(0, g - s))) }))
    } else {
      setForm({ ...form, stoneWeight: e.target.value })
    }
  }

  const onNetChange = (e) => {
    setForm({ ...form, netWeight: e.target.value })
    setNetManual(true)
  }

  // Live selling-price preview (actual stored price is computed on the backend).
  const netWeightPreview = netManual ? toNum(form.netWeight) : toNum(autoNet())
  const ratePreview = toNum(form.silverRateUsed)
  const mcPreview = toNum(form.makingCharge)
  const gstPreview = toNum(form.gstPercent)
  const stoneValuePreview = toNum(form.stoneValue)
  const canPreview = ![netWeightPreview, ratePreview, mcPreview].some(Number.isNaN)
  const basePreview = canPreview ? netWeightPreview * (ratePreview + mcPreview) + (Number.isNaN(stoneValuePreview) ? 0 : stoneValuePreview) : NaN
  const sellingPreview = canPreview && !Number.isNaN(gstPreview) ? basePreview + (basePreview * gstPreview) / 100 : NaN

  const handleSubmit = (e) => {
    e.preventDefault()

    const sku = form.sku.trim().toUpperCase()

    if (!isEdit && !SKU_PATTERN.test(sku)) {
      setSkuError('SKU must look like SLR-001 or SLV-RNG-00001 — letters, hyphens, then digits.')
      return
    }
    if (!isEdit && existingSkus.some((s) => s && String(s).trim().toUpperCase() === sku)) {
      setSkuError(`SKU "${sku}" already exists.`)
      return
    }

    if (form.barcode.trim()) {
      if (!/^\d{12}$/.test(form.barcode.trim())) {
        setBarcodeError('Barcode must be a 12-digit EAN number.')
        return
      }
    }

    const netWeight = netManual ? numOr(form.netWeight, 0) : numOr(autoNet(), 0)

    const payload = {
      sku,
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      collectionId: form.collectionId ? Number(form.collectionId) : null,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      barcode: form.barcode.trim() || null,
      purity: numOr(form.purity, 92.5),
      colour: form.colour.trim() || null,
      description: form.description.trim() || undefined,
      grossWeight: numOr(form.grossWeight, 0),
      stoneWeight: numOr(form.stoneWeight, 0),
      netWeight,
      stoneType: form.stoneType.trim() || null,
      stonePieces: form.stonePieces.trim() !== '' ? Number(form.stonePieces) : null,
      stoneValue: form.stoneValue.trim() !== '' ? numOr(form.stoneValue, 0) : 0,
      silverRateUsed: numOr(form.silverRateUsed, 0),
      makingCharge: numOr(form.makingCharge, 20),
      gstPercent: numOr(form.gstPercent, 3),
      compareAtPrice: form.compareAtPrice !== '' ? numOr(form.compareAtPrice, 0) : null,
      costPrice: form.costPrice !== '' ? numOr(form.costPrice, 0) : null,
      ...(isEdit ? {} : { initialStock: numOr(form.initialStock, 0) }),
      ...(isEdit ? { initialStock: numOr(form.initialStock, 0), updateStock: true } : {}),
      shopifyVendor: form.shopifyVendor.trim() || 'Opal Line',
      shopifyProductType: form.shopifyProductType.trim() || undefined,
      shopifyTags: form.shopifyTags.trim() || undefined,
      shopifyImageUrls: undefined,
      shopifyStatus: form.shopifyStatus,
      chargeTax: form.chargeTax,
      trackInventory: form.trackInventory,
      pushToShopify: form.pushToShopify,
    }

    const mediaUrls = (form.shopifyMedia || []).filter(m => m.url.trim()).map(m => m.url.trim())
    if (mediaUrls.length) payload.imageUrls = mediaUrls

    if (priceOverride !== '' && priceOverride !== undefined && priceOverride !== null) {
      payload.sellingPrice = Number(priceOverride)
    }

    onSubmit(payload)
  }

  const MAX_MEDIA = 10

  const mediaAt = (i) => (e) => setForm((cur) => ({ ...cur, shopifyMedia: cur.shopifyMedia.map((m, j) => (j === i ? { ...m, url: e.target.value } : m)) }))
  const mediaTypeAt = (i) => (e) => setForm((cur) => ({ ...cur, shopifyMedia: cur.shopifyMedia.map((m, j) => (j === i ? { ...m, type: e.target.value } : m)) }))
  const removeMediaAt = (i) => () => setForm((cur) => ({ ...cur, shopifyMedia: cur.shopifyMedia.filter((_, j) => j !== i) }))
  const addMedia = () => setForm((cur) => cur.shopifyMedia.length < MAX_MEDIA ? { ...cur, shopifyMedia: [...cur.shopifyMedia, { type: 'image', url: '' }] } : cur)

  const uploadMediaAt = (i) => async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await apiClient.post('/upload/media', formData)
      const url = res.data.data?.url
      if (url) {
        setForm((cur) => ({ ...cur, shopifyMedia: cur.shopifyMedia.map((m, j) => j === i ? { ...m, url, type: file.type.startsWith('video/') ? 'video' : 'image' } : m) }))
      }
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Upload failed: ' + (err.response?.data?.message || err.message))
    } finally {
      e.target.value = ''
    }
  }

  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteUrls, setPasteUrls] = useState('')

  const handlePasteSubmit = () => {
    const newUrls = pasteUrls.split('\n').map(u => u.trim()).filter(Boolean)
    if (!newUrls.length) return
    const added = newUrls.slice(0, MAX_MEDIA - form.shopifyMedia.length).map(u => ({ type: 'image', url: u }))
    setForm(cur => ({ ...cur, shopifyMedia: [...cur.shopifyMedia, ...added] }))
    setPasteUrls('')
    setPasteOpen(false)
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${product.name}` : 'Add New Product'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="product-form" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : form.pushToShopify ? 'Create & Push to Shopify' : 'Create Product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
        {submitError && (
          <div className="text-xs text-red-700 bg-red-50 dark:bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
            {submitError}
          </div>
        )}

        {/* ============ BASIC DETAILS ============ */}
        <div>
          <h3 className="text-sm font-semibold text-royal-800 dark:text-gray-200 mb-3">Basic Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Title</Label>
              <Input id="name" value={form.name} onChange={set('name')} required placeholder="e.g. Silver Ring" />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={set('sku')} required disabled={isEdit} placeholder="e.g. SLV-RNG-00001" />
              {skuError && <p className="text-xs text-red-600 mt-1">{skuError}</p>}
            </div>
            <div>
              <Label htmlFor="barcode">Barcode (EAN)</Label>
              <Input id="barcode" value={form.barcode} onChange={set('barcode')} maxLength={12} placeholder="12 digits" />
              {barcodeError && <p className="text-xs text-red-600 mt-1">{barcodeError}</p>}
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={form.categoryId} onChange={set('categoryId')} required>
                <option value="">Select...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="collection">Collection</Label>
              <Select id="collection" value={form.collectionId} onChange={set('collectionId')}>
                <option value="">None</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="purity">Purity %</Label>
              <Input id="purity" type="number" step="0.01" min="0" max="100" value={form.purity} onChange={set('purity')} />
            </div>
            <div>
              <Label htmlFor="colour">Colour</Label>
              <Input id="colour" value={form.colour} onChange={set('colour')} placeholder="e.g. White, Antique, Oxidised" />
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Select id="supplier" value={form.supplierId} onChange={set('supplierId')}>
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={set('description')} placeholder="Optional" className="min-h-16" />
            </div>
          </div>
        </div>

        {/* ============ WEIGHT & PRICING ============ */}
        <div>
          <h3 className="text-sm font-semibold text-royal-800 dark:text-gray-200 mb-3">Weight &amp; Pricing</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grossWeight">Gross weight (g)</Label>
              <Input id="grossWeight" type="number" step="0.001" min="0" value={form.grossWeight} onChange={onGrossChange} />
            </div>
            <div>
              <Label htmlFor="stoneWeight">Stone weight (g)</Label>
              <Input id="stoneWeight" type="number" step="0.001" min="0" value={form.stoneWeight} onChange={onStoneChange} />
            </div>
            <div>
              <Label htmlFor="stoneType">Stone type</Label>
              <Input id="stoneType" value={form.stoneType} onChange={set('stoneType')} placeholder="e.g. CZ, Ruby (blank = no stone)" />
            </div>
            <div>
              <Label htmlFor="stonePieces">No. of pieces</Label>
              <Input id="stonePieces" type="number" step="1" min="0" value={form.stonePieces} onChange={set('stonePieces')} placeholder="e.g. 3" />
            </div>
            <div>
              <Label htmlFor="stoneValue">Stone value (₹)</Label>
              <Input id="stoneValue" type="number" step="0.01" min="0" value={form.stoneValue} onChange={set('stoneValue')} placeholder="0 = not priced" />
            </div>
            <div>
              <Label htmlFor="netWeight">Net weight (g)</Label>
              <Input id="netWeight" type="number" step="0.001" min="0" value={form.netWeight} onChange={onNetChange} placeholder={autoNet()} />
              <p className="text-[11px] text-gray-400 mt-1">{netManual ? 'Manual override' : 'Auto: Gross − Stone'}</p>
            </div>
            <div className="flex items-end pb-1">
              <button type="button" onClick={() => { setNetManual(false); setForm((cur) => ({ ...cur, netWeight: '' })) }} className="text-xs text-royal-600 hover:underline">
                Re-enable auto net weight
              </button>
            </div>
<div>
              <Label htmlFor="silverRateUsed">Silver rate (₹/g)</Label>
              <div className="relative">
                <Input
                  id="silverRateUsed"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.silverRateUsed || silverRate != null ? String(silverRate) : ''}
                  readOnly
                  className="bg-gray-50 dark:bg-white/5 cursor-not-allowed"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400">
                  <Lock size={14} />
                  <span className="text-[10px] uppercase tracking-wider">Locked</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Locked to today's silver rate — price auto-calculates from this rate.</p>
            </div>
            <div>
              <Label htmlFor="makingCharge">Making charge (₹/g)</Label>
              <Input id="makingCharge" type="number" step="0.01" min="0" value={form.makingCharge} onChange={set('makingCharge')} required />
            </div>
            <div>
              <Label htmlFor="gst">GST %</Label>
              <Input id="gst" type="number" step="0.01" min="0" value={form.gstPercent} onChange={set('gstPercent')} />
            </div>
            <div className="flex items-end pb-1">
              <div className="w-full">
                <Label>Selling price (₹) — auto-calculated</Label>
                <Input readOnly value={Number.isNaN(sellingPreview) ? '' : formatINR(sellingPreview)} className="bg-royal-50 dark:bg-royal-500/10 text-royal-800 dark:text-gray-200 font-semibold" />
              </div>
            </div>
            <div className="flex items-end pb-1">
              <div className="w-full">
                <Label htmlFor="priceOverride">Manual selling price (₹) (optional)</Label>
                <Input id="priceOverride" type="number" step="0.01" min="0" value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} placeholder="Leave empty to auto-calculate" />
                <p className="text-[11px] text-gray-400 mt-1">Only fill this if you want to set the final price by hand — otherwise it is calculated automatically.</p>
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 bg-royal-50 dark:bg-white/5 rounded-lg px-3 py-2">
                Enter net weight and silver rate to auto-calculate the selling price. Base = net weight × (silver rate + making charge) + stone value, then + GST%.
              </p>
            </div>
            <div>
              <Label htmlFor="compareAtPrice">Compare-at price (₹)</Label>
              <Input id="compareAtPrice" type="number" step="0.01" min="0" value={form.compareAtPrice} onChange={set('compareAtPrice')} placeholder="Optional — strikethrough on Shopify" />
            </div>
            <div>
              <Label htmlFor="costPrice">Cost price (₹)</Label>
              <Input id="costPrice" type="number" step="0.01" min="0" value={form.costPrice} onChange={set('costPrice')} placeholder="Cost of goods per unit — used for margin reports" />
            </div>
            {!isEdit && (
              <div>
                <Label htmlFor="initialStock">Stock (pcs)</Label>
                <Input id="initialStock" type="number" step="1" min="0" value={form.initialStock} onChange={set('initialStock')} required />
              </div>
            )}
          </div>
        </div>

        {/* ============ SHOPIFY LISTING ============ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-royal-800 dark:text-gray-200">Shopify Listing</h3>
            <Toggle checked={form.pushToShopify} onChange={(v) => setForm({ ...form, pushToShopify: v })} label="Push to Shopify" />
          </div>

          {form.pushToShopify && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shopifyStatus">Status on Shopify</Label>
                <Select id="shopifyStatus" value={form.shopifyStatus} onChange={set('shopifyStatus')}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="shopifyVendor">Vendor</Label>
                <Input id="shopifyVendor" value={form.shopifyVendor} onChange={set('shopifyVendor')} />
              </div>
              <div>
                <Label htmlFor="shopifyProductType">Product type</Label>
                <Input id="shopifyProductType" value={form.shopifyProductType} onChange={set('shopifyProductType')} placeholder="e.g. Jewelry" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="shopifyTags">Tags (comma separated)</Label>
                <Input id="shopifyTags" value={form.shopifyTags} onChange={set('shopifyTags')} placeholder="silver, rings, bestseller" />
              </div>

              <div className="col-span-2">
                <Label>Product media (Shopify gallery — images & videos)</Label>
                <div className="space-y-2">
                  {form.shopifyMedia.map((media, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select value={media.type} onChange={mediaTypeAt(i)} className="w-24">
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </Select>
                      <Input value={media.url} onChange={mediaAt(i)} placeholder={`URL ${i + 1} — https://...`} className="flex-1" />
                      <label className="p-2 text-royal-600 dark:text-royal-400 hover:bg-royal-50 dark:hover:bg-royal-500/10 rounded-lg cursor-pointer flex items-center gap-1" title="Upload file">
                        <Upload size={16} />
                        <span className="hidden sm:inline text-xs font-medium">Upload</span>
                        <input type="file" accept="image/*,video/*" onChange={uploadMediaAt(i)} className="hidden" />
                      </label>
                      <button type="button" onClick={removeMediaAt(i)} disabled={form.shopifyMedia.length <= 1} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" title="Remove">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addMedia}
                      disabled={form.shopifyMedia.length >= MAX_MEDIA}
                      className="flex items-center gap-1 text-xs font-medium text-royal-600 dark:text-royal-400 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} /> Add media ({form.shopifyMedia.length}/{MAX_MEDIA})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasteOpen(true)}
                      disabled={form.shopifyMedia.length >= MAX_MEDIA}
                      className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} /> Paste URLs
                    </button>
                  </div>
                </div>

              {pasteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPasteOpen(false)}>
                  <div className="bg-white dark:bg-[#1a1025] rounded-xl shadow-xl w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-royal-950 dark:text-white mb-3">Paste Image URLs</h3>
                    <Textarea value={pasteUrls} onChange={e => setPasteUrls(e.target.value)} placeholder="Paste one URL per line..." className="mb-3" rows={6} />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setPasteOpen(false)}>Cancel</Button>
                      <Button onClick={handlePasteSubmit}>Add URLs</Button>
                    </div>
                  </div>
                </div>
              )}
                <p className="text-[11px] text-gray-400 mt-1">Add image or video URLs. Images are pushed to Shopify product gallery. Videos stored locally (Shopify video upload requires GraphQL). Maximum 10 items.</p>
              </div>

              <div className="col-span-2 flex items-center justify-between gap-4 border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2.5">
                <Toggle checked={form.trackInventory} onChange={(v) => setForm({ ...form, trackInventory: v })} label="Track inventory in Shopify" />
                <div className="w-32">
                  <Label htmlFor="shopifyStock">Available stock</Label>
                  <Input id="shopifyStock" type="number" step="1" min="0" value={form.initialStock} onChange={set('initialStock')} disabled={!form.trackInventory} />
                </div>
              </div>

              <div className="col-span-2">
                <Toggle checked={form.chargeTax} onChange={(v) => setForm({ ...form, chargeTax: v })} label="Charge tax on Shopify" />
                <p className="text-[11px] text-gray-400 mt-1">Separate from our internal GST% — this is the Shopify taxable flag applied to the storefront checkout.</p>
              </div>
            </div>
          )}

          {!form.pushToShopify && (
            <p className="text-xs text-gray-500">Saved as a billing-software-only product. Nothing is pushed to Shopify.</p>
          )}
        </div>
      </form>
    </Modal>
  )
}