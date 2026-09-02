import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Input, Select, Label, Textarea } from '../ui/FormControls'

// Real ERP SKUs look like SLR-001 / SLC-002 (letters, hyphen, digits).
const SKU_PATTERN = /^[A-Z]{2,}-\d{3,4}$/

const emptyForm = {
  sku: '',
  name: '',
  categoryId: '',
  description: '',
  weight: '',
  makingCharge: '',
  gstPercent: '3',
  lowStockThreshold: '5',
  initialStock: '0',
}

export default function ProductFormModal({ open, onClose, onSubmit, product, categories, submitting, existingSkus = [], submitError = '' }) {
  const [form, setForm] = useState(emptyForm)
  const [skuError, setSkuError] = useState('')
  const isEdit = Boolean(product)

  // Fill the form when editing a product
  useEffect(() => {
    if (!open) return
    if (product) {
      setForm({
        sku: product.sku,
        name: product.name,
        categoryId: String(product.categoryId),
        description: product.description || '',
        weight: String(product.weight),
        makingCharge: String(product.makingCharge),
        gstPercent: String(product.gstPercent),
        lowStockThreshold: String(product.lowStockThreshold),
        initialStock: String(product.inventory?.quantity ?? 0),
      })
    } else {
      setForm(emptyForm)
    }
  }, [open, product])

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    if (field === 'sku') setSkuError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const sku = form.sku.trim().toUpperCase()

    if (!isEdit && !SKU_PATTERN.test(sku)) {
      setSkuError('SKU must look like SLR-001 — letters, a hyphen, then digits (e.g. SLR-001, SLC-002).')
      return
    }

    if (!isEdit && existingSkus.some((s) => s && String(s).trim().toUpperCase() === sku)) {
      setSkuError(`SKU "${sku}" already exists.`)
      return
    }

    onSubmit({
      sku,
      name: form.name.trim(),
      categoryId: Number(form.categoryId),
      description: form.description.trim() || undefined,
      weight: Number(form.weight),
      makingCharge: Number(form.makingCharge),
      gstPercent: Number(form.gstPercent),
      lowStockThreshold: Number(form.lowStockThreshold),
      ...(isEdit ? {} : { initialStock: Number(form.initialStock) }),
    })
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
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="text-xs text-red-700 bg-red-50 dark:bg-red-500/10 border border-red-200 rounded-lg px-3 py-2">
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={form.sku} onChange={set('sku')} required disabled={isEdit} placeholder="e.g. SLR-001" />
            {skuError && <p className="text-xs text-red-600 mt-1">{skuError}</p>}
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
        </div>

        <div>
          <Label htmlFor="name">Product Name</Label>
          <Input id="name" value={form.name} onChange={set('name')} required placeholder="e.g. Silver Ring" />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={form.description} onChange={set('description')} placeholder="Optional" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="weight">Weight (grams)</Label>
            <Input id="weight" type="number" step="0.001" min="0" value={form.weight} onChange={set('weight')} required />
          </div>
          <div>
            <Label htmlFor="makingCharge">Making Charge (₹/gram)</Label>
            <Input id="makingCharge" type="number" step="0.01" min="0" value={form.makingCharge} onChange={set('makingCharge')} required />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="gst">GST %</Label>
            <Input id="gst" type="number" step="0.01" min="0" value={form.gstPercent} onChange={set('gstPercent')} />
          </div>
          <div>
            <Label htmlFor="lowStock">Low Stock Alert At</Label>
            <Input id="lowStock" type="number" min="0" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
          </div>
          {!isEdit && (
            <div>
              <Label htmlFor="initialStock">Initial Stock</Label>
              <Input id="initialStock" type="number" min="0" value={form.initialStock} onChange={set('initialStock')} />
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 bg-royal-50 dark:bg-white/5 rounded-lg p-3">
          Price is calculated automatically by the backend using the current silver rate + making charge + GST.
        </p>
      </form>
    </Modal>
  )
}
