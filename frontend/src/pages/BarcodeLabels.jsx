import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, Search, Tag, Download, Plus, X, Filter } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Input } from '../components/ui/FormControls'
import { formatINR } from '../utils/format'
import { productsApi } from '../api/products'

// Minimal 1D barcode (Code 39-like) renderer. Deterministic; safe, no deps.
const CODE39 = {
  '0': '1112212112', '1': '2112111121', '2': '1121112121', '3': '2112121111',
  '4': '1112121121', '5': '2112121211', '6': '1112211121', '7': '2112112112',
  '8': '1112112121', '9': '2112112112',
  A: '2112111212', B: '1121112121', C: '2112121112', D: '2112121211',
  E: '1112122112', F: '2112121211', G: '1112112121', H: '2112112112',
  I: '1121122112', J: '1121122112', K: '2112111221', L: '1112112112',
  M: '2112112112', N: '1112112112', O: '2112211211', P: '1112112112',
  Q: '2112122112', R: '2112211211', S: '1211121121', T: '2112122112',
  U: '1211121211', V: '1121122112', W: '1211122112', X: '2112121112',
  Y: '2112121112', Z: '2112122112',
  '-': '2112111121', '.': '2112111212', ' ': '2112111212', '$': '2112111212',
  '/': '2112111212', '+': '2112111212', '%': '2112111212', '*': '1211212112',
}

const NARROW = 2
const WIDE = 6

const buildModules = (value) => {
  const modules = []
  modules.push({ w: 10, bar: false })
  const encoded = `*${value}*`
  for (const ch of encoded) {
    const pattern = CODE39[ch] || CODE39['*']
    for (let i = 0; i < pattern.length; i++) {
      const wide = pattern[i] === '2'
      modules.push({ w: wide ? WIDE : NARROW, bar: i % 2 === 0 })
    }
    modules.push({ w: NARROW, bar: false })
  }
  modules.push({ w: 10, bar: false })
  return modules
}

const barcodeSvgString = (value, width = 260, height = 100, fontSize = 16) => {
  const modules = buildModules(value)
  const totalW = modules.reduce((s, m) => s + m.w, 0)
  const barHeight = height - 30
  const barOffsetY = 8
  let bars = ''
  let x = 0
  for (const m of modules) {
    if (m.bar) {
      bars += `<rect x="${x}" y="${barOffsetY}" width="${m.w * (width / totalW) - 1}" height="${barHeight}" fill="#000"/>`
    }
    x += m.w * (width / totalW)
  }
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#fff" stroke="#e5e7eb"/>
  ${bars}
  <text x="${width / 2}" y="${height - 8}" text-anchor="middle" font-size="${fontSize}" font-family="monospace" fill="#000">${value}</text>
</svg>`.trim()
}

function Barcode({ value, size = 120 }) {
  const modules = buildModules(value)
  const totalW = modules.reduce((s, m) => s + m.w, 0)
  const height = 60
  const displayWidth = size

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height + 26}`}
      width={displayWidth}
      height={(height + 26) * (displayWidth / totalW)}
      className="border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1025] rounded"
      preserveAspectRatio="xMidYMid meet"
    >
      {modules.reduce((acc, m, i) => {
        const x = acc.x
        if (m.bar) {
          acc.items.push(<rect key={i} x={x} y={0} width={m.w} height={height} fill="#000" />)
        }
        acc.x = x + m.w
        return acc
      }, { x: 0, items: [] }).items}
      <text x={totalW / 2} y={height + 16} textAnchor="middle" fontSize={8} fill="#000" fontFamily="monospace">
        {value}
      </text>
    </svg>
  )
}

const downloadSvg = (value) => {
  const svg = barcodeSvgString(value)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${value}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

const downloadPng = (value) => {
  const svg = barcodeSvgString(value)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const width = 260
    const height = 100
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    canvas.toBlob((b) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = `${value}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      URL.revokeObjectURL(url)
    })
  }
  img.src = url
}

const printSingleLabel = (item) => {
  const value = item.sku || item.value
  const svg = barcodeSvgString(value)
  const name = item._kind === 'product' ? item.name : `Custom: ${item.value}`
  const sku = item._kind === 'product' ? item.sku : 'Custom barcode'
  const price = item._kind === 'product' ? formatINR(item.sellingPrice) : ''
  const html = `
<html><head><title>${name}</title>
<style>
  body { margin: 16px; font-family: monospace; }
  .label { display: inline-flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
  .barcode { border: 1px solid #e5e7eb; padding: 4px; background: #fff; }
  .name { font-size: 12px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
  .sku { font-size: 9px; color: #6b7280; }
  .price { font-size: 10px; font-weight: 600; color: #059669; }
</style></head>
<body>
  <div class="label">
    <div class="barcode">${svg}</div>
    <div class="flex flex-col">
      <span class="name">${name}</span>
      <span class="sku">${sku}</span>
      ${price ? `<span class="price">${price}</span>` : ''}
    </div>
  </div>
</body></html>`
  const w = window.open('', '_blank', 'width=400,height=300')
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

const getBarcodeValue = (item) => item.sku || item.value

export default function BarcodeLabels() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showLowStock, setShowLowStock] = useState(false)
  const [selected, setSelected] = useState(null)
  const [fullView, setFullView] = useState(null)

  const [customInput, setCustomInput] = useState('')
  const [customBarcodes, setCustomBarcodes] = useState([])

  const { data: apiProducts = [], isLoading } = useQuery({
    queryKey: ['products', 'barcodes'],
    queryFn: () => productsApi.list().then((r) => r.data.data),
  })

  const products = (apiProducts || [])
    .map((p) => ({
      ...p,
      category: p.category?.name || '',
      quantity: Number(p.inventory?.quantity ?? 0),
      lowStockThreshold: Number(p.lowStockThreshold ?? 5),
    }))
    .filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false
      if (showLowStock && p.quantity > p.lowStockThreshold) return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false
      }
      return true
    })

  const categories = ['All', ...Array.from(new Set((apiProducts || []).map((p) => p.category?.name).filter(Boolean)))]

  const handleCreateCustom = (e) => {
    e.preventDefault()
    const val = customInput.trim()
    if (!val || !/^\d{1,10}$/.test(val)) return
    if (customBarcodes.some((c) => c.value === val)) {
      setCustomInput('')
      return
    }
    setCustomBarcodes((prev) => [...prev, { id: `custom-${Date.now()}`, value: val, label: '', _kind: 'custom' }])
    setCustomInput('')
  }

  const labelNode = (item, isProduct) => (
    <div
      key={item.id}
      className="label flex items-center gap-2 cursor-pointer select-none"
      onClick={() => setSelected(item.id === selected?.id ? null : item)}
    >
      <div className="barcode flex-shrink-0">
        <Barcode value={getBarcodeValue(item)} />
      </div>
      <div className="flex flex-col min-w-0">
        {isProduct ? (
          <>
            <span className="name text-sm font-medium text-royal-950 dark:text-white truncate">{item.name}</span>
            <span className="sku text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.sku}</span>
            <span className="price text-xs font-semibold text-royal-800 dark:text-gray-200">{formatINR(item.sellingPrice)}</span>
          </>
        ) : (
          <>
            <span className="name text-sm font-medium text-royal-950 dark:text-white">Custom: {item.value}</span>
            <span className="sku text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">Custom barcode</span>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" title="Download PNG" onClick={() => downloadPng(getBarcodeValue(item))}>
          <Download size={13} /> PNG
        </Button>
        <Button variant="ghost" size="sm" title="Download SVG" onClick={() => downloadSvg(getBarcodeValue(item))}>
          <Download size={13} /> SVG
        </Button>
        <Button variant="ghost" size="sm" title="Full view" onClick={() => setFullView(item)}>
          <Tag size={13} />
        </Button>
      </div>
    </div>
  )

  const allItems = [
    ...products.map((p) => ({ ...p, _kind: 'product' })),
    ...customBarcodes.map((c) => ({ ...c, _kind: 'custom' })),
  ]
  const printSet = (selected && [selected]) || allItems

  const handlePrint = () => {
    const printArea = document.getElementById('print-labels')
    if (!printArea) return
    const w = window.open('', '_blank', 'width=900,height=700')
    w.document.write(`
      <html><head><title>Barcode Labels</title>
      <style>
        @media print { body { margin: 0; } .label { page-break-inside: avoid; } }
        .label { display: flex; align-items: center; gap: 8px; padding: 6px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px; }
        .barcode { border: 1px solid #e5e7eb; padding: 4px; background: #fff; }
        .name { font-size: 11px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .sku { font-size: 9px; color: #6b7280; }
        .price { font-size: 10px; font-weight: 600; color: #059669; }
      </style></head><body>${printArea.innerHTML}</body></html>
    `)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div>
      <PageHeader title="Barcode / Labels" subtitle="Generate, download and print barcode labels for products" />

      {/* Create new barcode */}
      <Card title="Create New Barcode" icon={Plus} className="mb-6">
        <form className="flex items-end gap-3" onSubmit={handleCreateCustom}>
          <div className="flex-1">
            <label className="block text-sm font-medium text-royal-900 dark:text-gray-200 mb-1">Barcode value (10 digits)</label>
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="e.g. 8901234567"
              maxLength={10}
              inputMode="numeric"
              type="text"
            />
          </div>
          <Button type="submit" variant="gold" size="md" disabled={customInput.trim().length < 1 || customInput.trim().length > 10}>
            <Plus size={14} /> Add
          </Button>
        </form>
        {customBarcodes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {customBarcodes.map((c) => (
              <Badge key={c.id} tone="purple" className="flex items-center gap-1">
                {c.value}
                <button
                  onClick={() => setCustomBarcodes((prev) => prev.filter((x) => x.id !== c.id))}
                  className="ml-1 hover:text-red-600 cursor-pointer"
                  title="Remove"
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm focus:outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-1">
          <Filter size={14} className="text-gray-400 dark:text-gray-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            className="rounded border-gray-300 text-royal-600 dark:text-gray-300 focus:ring-royal-500"
          />
          Low stock only
        </label>
        <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
          <Tag size={14} /> Clear selection
        </Button>
        <Button size="sm" onClick={handlePrint} disabled={printSet.length === 0}>
          <Printer size={14} /> Print {printSet.length} label{printSet.length !== 1 ? 's' : ''}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview area (printable) */}
        <Card title="Label Preview" icon={Tag} id="print-labels" className="p-0 overflow-hidden">
          <div className="p-4 max-h-[640px] overflow-y-auto space-y-2">
            {allItems.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">No products match your filters.</div>
            ) : (
              allItems.map((item) => labelNode(item, item._kind === 'product'))
            )}
          </div>
        </Card>

        {/* Products picker */}
        <Card title="Products" icon={Search} className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-50 dark:bg-white/5 text-royal-900 dark:text-gray-200 text-left">
                  <th className="px-4 py-2 font-semibold">Product</th>
                  <th className="px-4 py-2 font-mono text-[11px]">Barcode</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-center">Label</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">Loading products...</td></tr>
                )}
                {!isLoading && products.map((p) => (
                  <tr key={p.id} className="hover:bg-royal-50 dark:hover:bg-white/5/30">
                    <td className="px-4 py-2">
                      <span className="font-medium text-royal-950 dark:text-white">{p.name}</span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{p.sku}</p>
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-gray-600 dark:text-gray-400 dark:text-gray-500">{p.sku}</td>
                    <td className="px-4 py-2 text-right font-semibold text-royal-800 dark:text-gray-200">{formatINR(p.sellingPrice)}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center">
                        <Barcode value={p.sku} />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="sm" title="Download as PNG" onClick={() => downloadPng(p.sku)}>
                          <Download size={13} />
                        </Button>
                        <Button variant="ghost" size="sm" title="Full view" onClick={() => setFullView(p)}>
                          <Tag size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Full view modal */}
      {fullView && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1025] rounded-xl shadow-xl max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setFullView(null)}
              className="absolute top-3 right-3 p-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:text-gray-200 cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center gap-4">
              <div className="p-3 border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1025] rounded">
                <Barcode value={getBarcodeValue(fullView)} size={320} />
              </div>
              {fullView._kind === 'product' || fullView.sku ? (
                <div className="text-center">
                  <h3 className="font-semibold text-royal-950 dark:text-white">{fullView.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{fullView.sku}</p>
                  <p className="text-sm font-bold text-royal-800 dark:text-gray-200 mt-1">{formatINR(fullView.sellingPrice)}</p>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="font-semibold text-royal-950 dark:text-white">Custom Barcode</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{fullView.value}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => downloadPng(getBarcodeValue(fullView))}>
                  <Download size={13} /> Download PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadSvg(getBarcodeValue(fullView))}>
                  <Download size={13} /> Download SVG
                </Button>
                <Button size="sm" onClick={() => printSingleLabel(fullView)}>
                  <Printer size={13} /> Print
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
