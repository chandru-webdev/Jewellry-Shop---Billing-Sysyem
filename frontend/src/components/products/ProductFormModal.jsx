import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Input, Select, Label, Textarea } from '../ui/FormControls'
import { formatINR } from '../../utils/format'

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
  description: '',
  grossWeight: '',
  stoneWeight: '',
  netWeight: '',
  silverRateUsed: '',
  makingCharge: '20',
  gstPercent: '3',
  compareAtPrice: '',
  initialStock: '0',
  shopifyVendor: 'Opal Line',
  shopifyProductType: '',
  shopifyTags: '',
  shopifyImageUrl: '',
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
    description: product.description || '',
    grossWeight: product.grossWeight != null ? String(product.grossWeight) : String(weight),
    stoneWeight: product.stoneWeight != null ? String(product.stoneWeight) : '0',
    netWeight: weight ? String(weight) : '',
    silverRateUsed: product.silverRateUsed != null ? String(product.silverRateUsed) : '',
    makingCharge: String(product.makingCharge ?? 20),
    gstPercent: String(product.gstPercent ?? 3),
    compareAtPrice: product.compareAtPrice != null ? String(product.compareAtPrice) : '',
    initialStock: String(product.inventory?.quantity ?? 0),
    shopifyVendor: product.shopifyVendor || 'Opal Line',
    shopifyProductType: product.shopifyProductType || '',
    shopifyTags: product.shopifyTags || '',
    shopifyImageUrl: product.shopifyImageUrl || '',
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
  const [priceManual, setPriceManual] = useState(false)
  const [priceOverride, setPriceOverride] = useState('')
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
  const canPreview = ![netWeightPreview, ratePreview, mcPreview].some(Number.isNaN)
  const basePreview = canPreview ? netWeightPreview * (ratePreview + mcPreview) : NaN
  const sellingPreview = canPreview && !Number.isNaN(gstPreview) ? basePreview + (basePreview * gstPreview) / 100 : NaN

  const enableOverride = () => {
    setPriceOverride(Number.isNaN(sellingPreview) ? '' : String(round3(sellingPreview)))
    setPriceManual(true)
  }

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
      description: form.description.trim() || undefined,
      grossWeight: numOr(form.grossWeight, 0),
      stoneWeight: numOr(form.stoneWeight, 0),
      netWeight,
      silverRateUsed: numOr(form.silverRateUsed, 0),
      makingCharge: numOr(form.makingCharge, 20),
      gstPercent: numOr(form.gstPercent, 3),
      compareAtPrice: form.compareAtPrice !== '' ? numOr(form.compareAtPrice, 0) : null,
      ...(isEdit ? {} : { initialStock: numOr(form.initialStock, 0) }),
      shopifyVendor: form.shopifyVendor.trim() || 'Opal Line',
      shopifyProductType: form.shopifyProductType.trim() || undefined,
      shopifyTags: form.shopifyTags.trim() || undefined,
      shopifyImageUrl: form.shopifyImageUrl.trim() || undefined,
      trackInventory: form.trackInventory,
      pushToShopify: form.pushToShopify,
    }

    if (priceManual && form.priceOverride !== undefined && priceOverride !== '') {
      payload.sellingPrice = Number(priceOverride)
    }

    onSubmit(payload)
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
              <Input id="silverRateUsed" type="number" step="0.01" min="0" value={form.silverRateUsed} onChange={set('silverRateUsed')} required placeholder={silverRate != null ? `Today: ${silverRate}` : 'Rate not set — enter today’s rate'} />
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
              {priceManual ? (
                <div className="w-full">
                  <Label htmlFor="priceOverride">Selling price (₹)</Label>
                  <Input id="priceOverride" type="number" step="0.01" min="0" value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} />
                  <button type="button" onClick={() => setPriceManual(false)} className="text-xs text-royal-600 hover:underline mt-1">Use auto price</button>
                </div>
              ) : (
                <div className="w-full">
                  <Label>Selling price (₹)</Label>
                  <Input readOnly value={Number.isNaN(sellingPreview) ? '' : formatINR(sellingPreview)} className="bg-gray-100 dark:bg-white/5 text-royal-800 dark:text-gray-200 font-semibold" />
                  <button type="button" onClick={enableOverride} className="text-xs text-royal-600 hover:underline mt-1">Override price</button>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 bg-royal-50 dark:bg-white/5 rounded-lg px-3 py-2">
                Enter net weight and silver rate to auto-calculate the selling price. Base = net weight × (silver rate + making charge), then + GST%.
              </p>
            </div>
            <div>
              <Label htmlFor="compareAtPrice">Compare-at price (₹)</Label>
              <Input id="compareAtPrice" type="number" step="0.01" min="0" value={form.compareAtPrice} onChange={set('compareAtPrice')} placeholder="Optional — strikethrough on Shopify" />
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
                <Label htmlFor="shopifyImageUrl">Product image URL</Label>
                <Input id="shopifyImageUrl" value={form.shopifyImageUrl} onChange={set('shopifyImageUrl')} placeholder="https://..." />
                <p className="text-[11px] text-gray-400 mt-1">Shopify fetches the photo from this URL.</p>
              </div>
              <div className="col-span-2 flex items-center">
                <Toggle checked={form.trackInventory} onChange={(v) => setForm({ ...form, trackInventory: v })} label="Track inventory in Shopify" />
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