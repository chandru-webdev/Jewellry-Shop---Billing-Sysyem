export const locations = [
  { id: 'godown', name: 'Main Godown', code: 'GD' },
  { id: 'retail', name: 'Retail Store', code: 'RS' },
  { id: 'warehouse', name: 'Warehouse', code: 'WH' },
]

const base = [
  { id: 1, sku: 'SLV-RNG-00021', name: 'Silver Classic Ring', category: 'Rings', weight: 5.2, makingCharge: 20, costValue: 11600, sellingPrice: 14112, reorderLevel: 10, threshold: 10 },
  { id: 2, sku: 'SLV-CHN-00008', name: 'Silver Chain 22"', category: 'Chains', weight: 25.5, makingCharge: 15, costValue: 8300, sellingPrice: 10150, reorderLevel: 12, threshold: 12 },
  { id: 3, sku: 'SLV-BRC-00015', name: 'Silver Bracelet', category: 'Bracelets', weight: 15.0, makingCharge: 18, costValue: 4200, sellingPrice: 5130, reorderLevel: 8, threshold: 8 },
  { id: 4, sku: 'SLV-PND-00012', name: 'Silver Pendant', category: 'Pendants', weight: 8.4, makingCharge: 22, costValue: 2930, sellingPrice: 3584, reorderLevel: 6, threshold: 6 },
  { id: 5, sku: 'SLV-ERN-00031', name: 'Silver Earrings', category: 'Earrings', weight: 6.8, makingCharge: 25, costValue: 3560, sellingPrice: 4352, reorderLevel: 15, threshold: 15 },
  { id: 6, sku: 'SLV-ANK-00044', name: 'Silver Anklet', category: 'Anklets', weight: 12.2, makingCharge: 18, costValue: 10420, sellingPrice: 12744, reorderLevel: 8, threshold: 8 },
  { id: 7, sku: 'SLV-NPS-00056', name: 'Silver Nose Pin', category: 'Nose Pins', weight: 1.2, makingCharge: 30, costValue: 800, sellingPrice: 980, reorderLevel: 20, threshold: 20 },
  { id: 8, sku: 'SLV-TRG-00062', name: 'Silver Toe Ring', category: 'Toe Rings', weight: 2.0, makingCharge: 12, costValue: 1200, sellingPrice: 1480, reorderLevel: 10, threshold: 10 },
  { id: 9, sku: 'SLV-BKY-00077', name: 'Silver Chain Bracelet', category: 'Bracelets', weight: 9.6, makingCharge: 18, costValue: 3100, sellingPrice: 3780, reorderLevel: 12, threshold: 12 },
  { id: 10, sku: 'SLV-MTL-00088', name: 'Silver Multi-Gem Ring', category: 'Rings', weight: 3.8, makingCharge: 24, costValue: 2200, sellingPrice: 2700, reorderLevel: 10, threshold: 10 },
]

export const mockProducts = base.map((p, i) => ({
  ...p,
  quantity: i % 5 === 0 ? (i === 0 ? 24 : 0) : (i % 5 === 1 ? 5 : i % 5 === 2 ? 3 : i % 5 === 3 ? 2 : 6),
  locations: {
    godown: i % 5 === 0 ? (i === 0 ? 14 : 0) : Math.max(0, Math.floor(Math.random() * 10)),
    retail: i % 5 === 0 ? (i === 0 ? 10 : 0) : Math.max(0, Math.floor(Math.random() * 6)),
    warehouse: i % 5 === 0 ? 0 : Math.max(0, Math.floor(Math.random() * 4)),
  },
  barcode: `890${String(p.id).padStart(6, '0')}`,
  image: `/products/${p.sku}.png`,
}))

export const lowStockProducts = () =>
  mockProducts.filter((p) => p.quantity <= p.reorderLevel)

export const transferHistory = [
  { id: 'TRF-001', date: '2026-08-18T14:30:00', sku: 'SLV-RNG-00021', name: 'Silver Classic Ring', from: 'godown', to: 'retail', qty: 10, by: 'Admin' },
  { id: 'TRF-002', date: '2026-08-17T09:15:00', sku: 'SLV-CHN-00008', name: 'Silver Chain 22"', from: 'warehouse', to: 'godown', qty: 5, by: 'Priya' },
  { id: 'TRF-003', date: '2026-08-16T16:45:00', sku: 'SLV-BRC-00015', name: 'Silver Bracelet', from: 'godown', to: 'retail', qty: 3, by: 'Admin' },
]

export const activityLog = [
  { id: 'ACT-001', time: '2026-08-18T09:00:00', user: 'Admin', action: 'Updated Silver Rate', detail: '₹90.00 → ₹92.80 /gm', type: 'rate' },
  { id: 'ACT-002', time: '2026-08-18T14:30:00', user: 'Admin', action: 'Stock Transfer', detail: '10 pcs Silver Classic Ring moved GD → RS', type: 'stock' },
  { id: 'ACT-003', time: '2026-08-17T11:20:00', user: 'Priya', action: 'Low Stock Alert', detail: 'Silver Earrings below threshold', type: 'alert' },
  { id: 'ACT-004', time: '2026-08-16T17:10:00', user: 'Admin', action: 'Product Updated', detail: 'Silver Pendant weight: 8.2g → 8.4g', type: 'product' },
  { id: 'ACT-005', time: '2026-08-15T08:45:00', user: 'System', action: 'Auto-price Recalculation', detail: '285 products updated after silver rate change', type: 'price' },
]

export const salesReturnHistory = [
  { id: 1, returnNo: 'SRN-0001', date: '2026-08-15', customer: 'Riya Sharma', sku: 'SLV-RNG-00021', name: 'Silver Classic Ring', qty: 1, reason: 'Defective', refund: 14112, status: 'Approved' },
  { id: 2, returnNo: 'SRN-0000', date: '2026-08-12', customer: 'Amit Patel', sku: 'SLV-CHN-00008', name: 'Silver Chain 22"', qty: 1, reason: 'Wrong item', refund: 10150, status: 'Pending' },
]
