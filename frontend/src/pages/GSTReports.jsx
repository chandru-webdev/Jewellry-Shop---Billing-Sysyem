import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Receipt, Scale, Landmark } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatINR, formatDate } from '../utils/format'
import { invoicesApi } from '../api/invoices'
import { settingsApi } from '../api/settings'

const MONTHS = [
  { key: '0', label: 'This Month' },
  { key: '1', label: 'Last Month' },
  { key: '2', label: 'Last 2 Months' },
  { key: 'quarter', label: 'This Quarter' },
]

function currentRange(preset) {
  const now = new Date()
  if (preset === '0') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
  if (preset === '1') return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) }
  if (preset === '2') return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: now }
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  return { from: qStart, to: now }
}

function stateCode(gstin) {
  if (!gstin) return null
  const m = String(gstin).trim().toUpperCase().match(/^(\d{2})/)
  return m ? m[1] : null
}

export default function GSTReports() {
  const [preset, setPreset] = useState('0')

  const { from, to } = useMemo(() => {
    const r = currentRange(preset)
    return { from: r.from.toISOString().slice(0, 10), to: r.to.toISOString().slice(0, 10) }
  }, [preset])

  useQuery({ queryKey: ['gst-dummy'], queryFn: () => reportsApi.sales({ from, to }).then(() => ({})), retry: false, enabled: false })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then((r) => r.data.data),
    retry: false,
  })

  const { data: invData, isLoading, isError } = useQuery({
    queryKey: ['gst-invoices', { from, to }],
    queryFn: () => invoicesApi.list({ dateFrom: from, dateTo: to, limit: 500 }).then((r) => r.data.data),
    retry: false,
  })

  const ownState = stateCode(settings?.gstin)

  const invoices = useMemo(() => {
    return (invData || [])
      .filter((inv) => inv.status !== 'VOID')
      .map((inv) => {
        const taxable = Number(inv.grandTotal) - Number(inv.gstTotal)
        const gst = Number(inv.gstTotal)
        const custState = stateCode(inv.customer?.gstin)
        const inter = ownState !== null && custState !== null && ownState !== custState
        const b2b = Boolean(inv.customer?.gstin)
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customer: inv.customer?.name || 'Walk-in / Counter Sale',
          taxType: b2b ? 'B2B' : 'B2C',
          taxable,
          gst,
          cgst: inter ? 0 : gst / 2,
          sgst: inter ? 0 : gst / 2,
          igst: inter ? gst : 0,
          grandTotal: Number(inv.grandTotal),
        }
      })
      .sort((a, b) => b.date - a.date)
  }, [invData, ownState])

  const summary = useMemo(() => {
    const s = { invoices: invoices.length, taxable: 0, gst: 0, cgst: 0, sgst: 0, igst: 0, b2b: 0, b2c: 0, grand: 0 }
    for (const i of invoices) {
      s.taxable += i.taxable
      s.gst += i.gst
      s.cgst += i.cgst
      s.sgst += i.sgst
      s.igst += i.igst
      s.grand += i.grandTotal
      if (i.taxType === 'B2B') s.b2b += 1
      else s.b2c += 1
    }
    return s
  }, [invoices])

  const byRate = useMemo(() => {
    const map = new Map()
    for (const i of invoices) {
      const rate = i.taxable > 0 ? Math.round((i.gst / i.taxable) * 100) : 0
      const e = map.get(rate) || { rate, taxable: 0, gst: 0, cgst: 0, sgst: 0, igst: 0 }
      e.taxable += i.taxable
      e.gst += i.gst
      e.cgst += i.cgst
      e.sgst += i.sgst
      e.igst += i.igst
      map.set(rate, e)
    }
    return [...map.values()].sort((a, b) => a.rate - b.rate)
  }, [invoices])

  const kpis = [
    { label: 'Taxable Value', value: formatINR(summary.taxable), icon: Receipt, tone: 'text-royal-600' },
    { label: 'GST Charged', value: formatINR(summary.gst), icon: Scale, tone: 'text-emerald-600' },
    { label: 'CGST + SGST', value: formatINR(summary.cgst + summary.sgst), icon: Landmark, tone: 'text-purple-600' },
    { label: 'IGST (Inter-state)', value: formatINR(summary.igst), icon: Building2, tone: 'text-amber-600' },
    { label: 'Nett Amount', value: formatINR(summary.grand), icon: Receipt, tone: 'text-royal-600' },
  ]

  return (
    <div>
      <PageHeader title="GST Reports" subtitle={`GSTR-1 / GSTR-3B style summaries — ${settings?.gstin ? `GSTIN ${settings.gstin}` : 'GSTIN not configured in Settings'}`} />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {MONTHS.map((m) => (
          <button key={m.key} onClick={() => setPreset(m.key)} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${preset === m.key ? 'bg-royal-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-royal-100 dark:hover:bg-white/20'}`}>
            {m.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{formatDate(from)} — {formatDate(to)}</span>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Preparing GST summary…</Card>
      ) : isError ? (
        <Card className="p-8 text-center text-red-500 text-sm">Failed to load invoices.</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white dark:bg-[#1a1025] rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1"><k.icon size={14} className={k.tone} /><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">{k.label}</p></div>
                <p className="text-base font-bold text-royal-950 dark:text-white mt-0.5">{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <Card title="GSTR-3B Summary" className="!p-4">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  <tr><td className="py-2 text-gray-600 dark:text-gray-400">Outward taxable supplies</td><td className="py-2 text-right font-semibold text-royal-950 dark:text-white">{summary.b2b} B2B + {summary.b2c} B2C</td></tr>
                  <tr><td className="py-2 text-gray-600 dark:text-gray-400">3.1(a) Intra-state (CGST)</td><td className="py-2 text-right font-semibold text-royal-950 dark:text-white">{formatINR(summary.cgst)}</td></tr>
                  <tr><td className="py-2 text-gray-600 dark:text-gray-400">3.1(b) Intra-state (SGST)</td><td className="py-2 text-right font-semibold text-royal-950 dark:text-white">{formatINR(summary.sgst)}</td></tr>
                  <tr><td className="py-2 text-gray-600 dark:text-gray-400">3.1(c) Inter-state (IGST)</td><td className="py-2 text-right font-semibold text-royal-950 dark:text-white">{formatINR(summary.igst)}</td></tr>
                  <tr className="bg-royal-50 dark:bg-white/5"><td className="py-2.5 font-medium text-royal-950 dark:text-white">Total Tax (CGST+SGST+IGST)</td><td className="py-2.5 text-right font-bold text-royal-700 dark:text-gray-200">{formatINR(summary.gst)}</td></tr>
                </tbody>
              </table>
              <div className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                Inter-state is inferred from GSTIN state codes (own {String(ownState ?? '--')}). Does not include VOID invoices. Input Tax Credit is not computed from expenses here.
              </div>
            </Card>

            <Card title="Tax Summary by Rate" className="lg:col-span-2 !p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider">
                    <th className="pb-2">Rate</th>
                    <th className="pb-2 text-right">Taxable</th>
                    <th className="pb-2 text-right">CGST</th>
                    <th className="pb-2 text-right">SGST</th>
                    <th className="pb-2 text-right">IGST</th>
                    <th className="pb-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {byRate.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400 dark:text-gray-500">No tax-liable sales this period.</td></tr>}
                  {byRate.map((r) => (
                    <tr key={r.rate}>
                      <td className="py-2.5"><Badge tone={r.rate > 0 ? 'gold' : 'gray'}>{r.rate > 0 ? `${r.rate}%` : 'Exempt'}</Badge></td>
                      <td className="py-2.5 text-right font-semibold text-royal-950 dark:text-white">{formatINR(r.taxable)}</td>
                      <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{formatINR(r.cgst)}</td>
                      <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{formatINR(r.sgst)}</td>
                      <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{formatINR(r.igst)}</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600">{formatINR(r.gst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">Rate is the effective GST rate per invoice (GST ÷ taxable). For GSTR-1 HSN detail, use the monthly export in Data &amp; Backups.</p>
            </Card>
          </div>

          <Card title={`GSTR-1 Invoice-wise Details ${summary.b2b} B2B · ${summary.b2c} B2C`} className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Invoice</th>
                    <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Date</th>
                    <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Party</th>
                    <th className="px-5 py-3 font-semibold text-royal-900 dark:text-gray-200">Type</th>
                    <th className="px-5 py-3 font-semibold text-right text-royal-900 dark:text-gray-200">Taxable</th>
                    <th className="px-5 py-3 font-semibold text-right text-royal-900 dark:text-gray-200">CGST</th>
                    <th className="px-5 py-3 font-semibold text-right text-royal-900 dark:text-gray-200">SGST</th>
                    <th className="px-5 py-3 font-semibold text-right text-royal-900 dark:text-gray-200">IGST</th>
                    <th className="px-5 py-3 font-semibold text-right text-royal-900 dark:text-gray-200">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.length === 0 && <tr><td colSpan={9} className="px-5 py-6 text-center text-gray-400 dark:text-gray-500">No invoices this period.</td></tr>}
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-royal-50 dark:hover:bg-white/5">
                      <td className="px-5 py-3 font-mono text-xs text-royal-700 dark:text-gray-300">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{formatDate(inv.date)}</td>
                      <td className="px-5 py-3 font-medium text-royal-950 dark:text-white">{inv.customer}</td>
                      <td className="px-5 py-3"><Badge tone={inv.taxType === 'B2B' ? 'purple' : 'gray'}>{inv.taxType}</Badge></td>
                      <td className="px-5 py-3 text-right font-semibold text-royal-950 dark:text-white">{formatINR(inv.taxable)}</td>
                      <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-300">{formatINR(inv.cgst)}</td>
                      <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-300">{formatINR(inv.sgst)}</td>
                      <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-300">{formatINR(inv.igst)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-600">{formatINR(inv.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                {invoices.length > 0 && (
                  <tfoot>
                    <tr className="bg-royal-50/60 dark:bg-white/5 border-t-2 border-royal-200 dark:border-white/10 font-semibold">
                      <td className="px-5 py-3 text-royal-800 dark:text-gray-200" colSpan={4}>Total</td>
                      <td className="px-5 py-3 text-right text-royal-800 dark:text-gray-200">{formatINR(summary.taxable)}</td>
                      <td className="px-5 py-3 text-right text-royal-800 dark:text-gray-200">{formatINR(summary.cgst)}</td>
                      <td className="px-5 py-3 text-right text-royal-800 dark:text-gray-200">{formatINR(summary.sgst)}</td>
                      <td className="px-5 py-3 text-right text-royal-800 dark:text-gray-200">{formatINR(summary.igst)}</td>
                      <td className="px-5 py-3 text-right text-emerald-700">{formatINR(summary.grand)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}