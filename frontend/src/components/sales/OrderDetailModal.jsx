import { useQuery } from '@tanstack/react-query'
import { User, Phone, Mail, MapPin, CreditCard, Hash, Calendar, Package } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { ordersApi } from '../../api/orders'
import { formatINR, formatDateTime } from '../../utils/format'
import { orderStatusTone } from './statusMaps'

function firstImage(item) {
  const img = item?.product?.shopifyImageUrl
  if (img) return img
  const urls = item?.product?.imageUrls
  if (Array.isArray(urls) && urls.length > 0 && urls[0]) return urls[0]
  return null
}

function DetailItem({ icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-royal-400 dark:text-gray-500 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">{label}</p>
        <div className="text-sm font-medium text-royal-950 dark:text-white">{children}</div>
      </div>
    </div>
  )
}

// Single order-detail modal shared by the Sales "Orders"/"Returns" tabs and the
// dedicated Sales Orders / Sales Returns pages, so every entry point renders the
// same rich view (customer, payments, line items, order total).
export default function OrderDetailModal({ open, orderId, onClose }) {
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', 'detail', orderId],
    queryFn: () => ordersApi.get(orderId).then((r) => r.data.data),
    enabled: open && !!orderId,
    retry: false,
  })

  const items = order?.items || []
  const payments = order?.payments || []

  return (
    <Modal
      open={open}
      title="Sales Order Details"
      size="xl"
      onClose={onClose}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {isLoading && <div className="py-10 text-center text-sm text-gray-400">Loading...</div>}
      {isError && <div className="py-10 text-center text-sm text-red-500">Failed to load order details.</div>}

      {order && (
        <div className="space-y-5">
          {/* Order header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-royal-50/60 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Order Number</p>
              <p className="font-bold text-royal-950 dark:text-white text-lg">{order.orderNumber || `#${order.shopifyOrderId || ''}`}</p>
            </div>
            <div className="bg-royal-50/60 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Status</p>
              <Badge tone={orderStatusTone[order.status] || 'gray'}>{order.status}</Badge>
            </div>
            <div className="bg-royal-50/60 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Total</p>
              <p className="font-bold text-royal-950 dark:text-white">{formatINR(order.totalAmount)}</p>
            </div>
            <div className="bg-royal-50/60 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Date</p>
              <p className="font-medium text-royal-950 dark:text-white text-sm">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>

          {/* Customer */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-royal-600 dark:text-royal-400 mb-3">Customer</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailItem icon={<User size={15} />} label="Name">{order.customer?.name || 'Walk-in'}</DetailItem>
              <DetailItem icon={<Phone size={15} />} label="Phone">{order.customer?.phone || '—'}</DetailItem>
              <DetailItem icon={<Mail size={15} />} label="Email">{order.customer?.email || '—'}</DetailItem>
              <DetailItem icon={<Hash size={15} />} label="Shopify Order ID">{order.shopifyOrderId ? `#${order.shopifyOrderId}` : '—'}</DetailItem>
            </div>
            {order.customer?.address && (
              <div className="mt-3">
                <DetailItem icon={<MapPin size={15} />} label="Address">
                  <p>{order.customer.address}</p>
                </DetailItem>
              </div>
            )}
          </section>

          <div className="h-px bg-gray-100 dark:bg-white/[0.08]" />

          {/* Payment */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-royal-600 dark:text-royal-400 mb-3">Payment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <DetailItem icon={<CreditCard size={15} />} label="Method">{order.paymentMethod || order.invoice?.paymentMethod || '—'}</DetailItem>
              <DetailItem icon={<Hash size={15} />} label="Invoice">{order.invoice?.invoiceNumber || '—'}</DetailItem>
              <DetailItem icon={<Calendar size={15} />} label="Order Date">{formatDateTime(order.createdAt)}</DetailItem>
            </div>
            {payments.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.08]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5 text-left">
                      <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Method</th>
                      <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400 text-right">Amount</th>
                      <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400 text-center">Status</th>
                      <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Reference</th>
                      <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-gray-100 dark:border-white/[0.05]">
                        <td className="px-3 py-2 font-medium">{p.method}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatINR(p.amount)}</td>
                        <td className="px-3 py-2 text-center"><Badge tone={p.status === 'PAID' ? 'green' : p.status === 'PENDING' ? 'orange' : 'red'}>{p.status}</Badge></td>
                        <td className="px-3 py-2 text-xs text-gray-500 font-mono">{p.reference || '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{formatDateTime(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="h-px bg-gray-100 dark:bg-white/[0.08]" />

          {/* Products */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-royal-600 dark:text-royal-400 mb-3">
              <Package size={13} className="inline mr-1" /> Products ({items.length})
            </h4>
            <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-white/[0.08]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Product</th>
                    <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400 text-right">Qty</th>
                    <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400 text-right">Price</th>
                    <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan="4" className="px-3 py-4 text-center text-sm text-gray-400">No items</td></tr>
                  )}
                  {items.map((it) => {
                    const img = firstImage(it)
                    return (
                      <tr key={it.id} className="border-t border-gray-100 dark:border-white/[0.05]">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            {img ? (
                              <img src={img} alt={it.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
                                <Package size={16} className="text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-royal-950 dark:text-white">{it.name}</p>
                              <p className="text-[11px] font-mono text-gray-400">{it.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-400">{it.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-400">{formatINR(Number(it.unitPrice || 0))}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-royal-800 dark:text-gray-200">{formatINR(Number(it.lineTotal ?? it.unitPrice * it.quantity))}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-100 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02]">
                    <td colSpan="3" className="px-3 py-2 text-right text-xs font-medium text-gray-500">Order Total</td>
                    <td className="px-3 py-2 text-right font-bold text-royal-800 dark:text-gray-100">{formatINR(Number(order.totalAmount || 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      )}
    </Modal>
  )
}