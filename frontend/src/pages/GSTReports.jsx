import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { formatINR } from '../utils/format'

const GSTR1_DATA = [
  { invoiceNo: 'INV-2026-001', date: '2026-08-10', customerName: 'Rajesh Kumar', customerGSTIN: '27AABCU9603R1ZM', placeOfSupply: 'Maharashtra', invoiceType: 'B2B', taxableAmount: 45000, cgst: 675, sgst: 675, igst: 0, totalAmount: 46350 },
  { invoiceNo: 'INV-2026-002', date: '2026-08-10', customerName: 'Priya Sharma', customerGSTIN: '27AACFP2983E1Z8', placeOfSupply: 'Maharashtra', invoiceType: 'B2B', taxableAmount: 62000, cgst: 930, sgst: 930, igst: 0, totalAmount: 63860 },
  { invoiceNo: 'INV-2026-003', date: '2026-08-09', customerName: 'Amit Patel', customerGSTIN: '24AABCP5672F1ZQ', placeOfSupply: 'Gujarat', invoiceType: 'B2B', taxableAmount: 34500, cgst: 0, sgst: 0, igst: 1035, totalAmount: 35535 },
  { invoiceNo: 'INV-2026-004', date: '2026-08-09', customerName: 'Sneha Reddy', customerGSTIN: '36AAACR8271G1ZP', placeOfSupply: 'Telangana', invoiceType: 'B2B', taxableAmount: 128000, cgst: 0, sgst: 0, igst: 3840, totalAmount: 131840 },
  { invoiceNo: 'INV-2026-005', date: '2026-08-08', customerName: 'Vikram Singh', customerGSTIN: '', placeOfSupply: 'Maharashtra', invoiceType: 'B2C', taxableAmount: 22100, cgst: 332, sgst: 332, igst: 0, totalAmount: 22764 },
  { invoiceNo: 'INV-2026-006', date: '2026-08-08', customerName: 'Neha Gupta', customerGSTIN: '', placeOfSupply: 'Maharashtra', invoiceType: 'B2C', taxableAmount: 18500, cgst: 278, sgst: 278, igst: 0, totalAmount: 19056 },
  { invoiceNo: 'INV-2026-007', date: '2026-08-07', customerName: 'Ravi Mehta', customerGSTIN: '27AABCM4521H1ZK', placeOfSupply: 'Maharashtra', invoiceType: 'B2B', taxableAmount: 89000, cgst: 1335, sgst: 1335, igst: 0, totalAmount: 91670 },
  { invoiceNo: 'INV-2026-008', date: '2026-08-07', customerName: 'Ananya Desai', customerGSTIN: '', placeOfSupply: 'Karnataka', invoiceType: 'B2C', taxableAmount: 56000, cgst: 0, sgst: 0, igst: 1680, totalAmount: 57680 },
]

const GSTR3B_SUMMARY = {
  outwardTaxable: 2650000, cgst: 39750, sgst: 39750, igst: 0, cess: 0, totalTax: 79500,
  inwardTaxable: 1950000, itcCGST: 29250, itcSGST: 29250, itcIGST: 0, totalITC: 58500,
  netTaxPayable: 21000,
}

const HSN_DATA = [
  { hsnCode: '7113', description: 'Silver jewellery articles', uqc: 'KGS', quantity: 45.5, taxableValue: 2250000, cgstRate: 1.5, cgstAmount: 33750, sgstRate: 1.5, sgstAmount: 33750, igstAmount: 0 },
  { hsnCode: '7113', description: 'Gold jewellery articles', uqc: 'KGS', quantity: 3.2, taxableValue: 380000, cgstRate: 1.5, cgstAmount: 5700, sgstRate: 1.5, sgstAmount: 5700, igstAmount: 0 },
  { hsnCode: '7101', description: 'Pearls, natural or cultured', uqc: 'KGS', quantity: 0.5, taxableValue: 85000, cgstRate: 1.5, cgstAmount: 1275, sgstRate: 1.5, sgstAmount: 1275, igstAmount: 6525 },
  { hsnCode: '7117', description: 'Imitation jewellery', uqc: 'PCS', quantity: 150, taxableValue: 45000, cgstRate: 1.5, cgstAmount: 675, sgstRate: 1.5, sgstAmount: 675, igstAmount: 2025 },
  { hsnCode: '7106', description: 'Silver unwrought', uqc: 'KGS', quantity: 12.0, taxableValue: 890000, cgstRate: 1.5, cgstAmount: 13350, sgstRate: 1.5, sgstAmount: 13350, igstAmount: 0 },
  { hsnCode: '7108', description: 'Gold unwrought', uqc: 'KGS', quantity: 1.8, taxableValue: 1120000, cgstRate: 1.5, cgstAmount: 16800, sgstRate: 1.5, sgstAmount: 16800, igstAmount: 0 },
]

const tabs = [
  { key: 'gstr1', label: 'GSTR-1', icon: FileText },
  { key: 'gstr3b', label: 'GSTR-3B', icon: FileText },
  { key: 'hsn', label: 'HSN Summary', icon: FileText },
]

export default function GSTReports() {
  const [activeTab, setActiveTab] = useState('gstr1')
  const [month, setMonth] = useState('2026-08')

  const totalTaxable = GSTR1_DATA.reduce((s, r) => s + r.taxableAmount, 0)
  const totalCGST = GSTR1_DATA.reduce((s, r) => s + r.cgst, 0)
  const totalSGST = GSTR1_DATA.reduce((s, r) => s + r.sgst, 0)
  const totalIGST = GSTR1_DATA.reduce((s, r) => s + r.igst, 0)
  const totalTax = totalCGST + totalSGST + totalIGST

  return (
    <div>
      <PageHeader title="GST Reports" subtitle="GSTR-1, GSTR-3B and HSN-wise summary for tax filing" actions={
        <div className="flex gap-2">
          <Button variant="outline"><Download size={14} className="mr-1" /> Export CSV</Button>
          <Button variant="outline"><FileText size={14} className="mr-1" /> Print</Button>
        </div>
      } />

      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Period:</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-1 mb-5 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${activeTab === t.key ? 'bg-white dark:bg-[#1a1025] text-royal-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'gstr1' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Invoices</p><p className="text-xl font-bold text-royal-600 mt-0.5">{GSTR1_DATA.length}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Taxable Value</p><p className="text-xl font-bold text-royal-600 mt-0.5">{formatINR(totalTaxable)}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total CGST</p><p className="text-xl font-bold text-emerald-600 mt-0.5">{formatINR(totalCGST)}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Tax</p><p className="text-xl font-bold text-royal-800 mt-0.5">{formatINR(totalTax)}</p></Card>
          </div>

          <Card title="GSTR-1 - Outward Supplies" className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Invoice No</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Date</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Customer</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">GSTIN</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Supply</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Type</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Taxable</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">CGST</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">SGST</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">IGST</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {GSTR1_DATA.map((r, i) => (
                    <tr key={r.invoiceNo} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-medium text-royal-700">{r.invoiceNo}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{r.date}</td>
                      <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{r.customerName}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 dark:text-gray-500 font-mono text-xs">{r.customerGSTIN || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 dark:text-gray-500">{r.placeOfSupply}</td>
                      <td className="px-4 py-2.5"><Badge tone={r.invoiceType === 'B2B' ? 'blue' : 'purple'}>{r.invoiceType}</Badge></td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatINR(r.taxableAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(r.cgst)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(r.sgst)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-orange-600">{formatINR(r.igst)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800">{formatINR(r.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-royal-50 border-t-2 border-royal-200 font-semibold">
                    <td className="px-4 py-3 text-royal-800" colSpan={6}>Total</td>
                    <td className="px-4 py-3 text-right font-mono text-royal-800">{formatINR(totalTaxable)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatINR(totalCGST)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatINR(totalSGST)}</td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600">{formatINR(totalIGST)}</td>
                    <td className="px-4 py-3 text-right font-mono text-royal-800">{formatINR(totalTaxable + totalTax)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'gstr3b' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Outward Taxable</p><p className="text-xl font-bold text-royal-600 mt-0.5">{formatINR(GSTR3B_SUMMARY.outwardTaxable)}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Tax Liability</p><p className="text-xl font-bold text-red-600 mt-0.5">{formatINR(GSTR3B_SUMMARY.totalTax)}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Input Tax Credit</p><p className="text-xl font-bold text-emerald-600 mt-0.5">{formatINR(GSTR3B_SUMMARY.totalITC)}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Net Tax Payable</p><p className="text-xl font-bold text-royal-800 mt-0.5">{formatINR(GSTR3B_SUMMARY.netTaxPayable)}</p></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="3.1 Outward Supplies">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/[0.05]"><span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Total Taxable Value</span><span className="text-sm font-semibold">{formatINR(GSTR3B_SUMMARY.outwardTaxable)}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/[0.05]"><span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">CGST</span><span className="text-sm font-semibold text-emerald-700">{formatINR(GSTR3B_SUMMARY.cgst)}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/[0.05]"><span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">SGST</span><span className="text-sm font-semibold text-emerald-700">{formatINR(GSTR3B_SUMMARY.sgst)}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/[0.05]"><span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">IGST</span><span className="text-sm font-semibold text-orange-600">{formatINR(GSTR3B_SUMMARY.igst)}</span></div>
                <div className="flex justify-between py-2 bg-royal-50 rounded-lg px-3"><span className="text-sm font-semibold text-royal-800">Total Tax</span><span className="text-sm font-bold text-royal-800">{formatINR(GSTR3B_SUMMARY.totalTax)}</span></div>
              </div>
            </Card>

            <Card title="4 Eligible ITC">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/[0.05]"><span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Inward Taxable Value</span><span className="text-sm font-semibold">{formatINR(GSTR3B_SUMMARY.inwardTaxable)}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/[0.05]"><span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">ITC - CGST</span><span className="text-sm font-semibold text-emerald-700">{formatINR(GSTR3B_SUMMARY.itcCGST)}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/[0.05]"><span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">ITC - SGST</span><span className="text-sm font-semibold text-emerald-700">{formatINR(GSTR3B_SUMMARY.itcSGST)}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/[0.05]"><span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">ITC - IGST</span><span className="text-sm font-semibold text-orange-600">{formatINR(GSTR3B_SUMMARY.itcIGST)}</span></div>
                <div className="flex justify-between py-2 bg-emerald-50 rounded-lg px-3"><span className="text-sm font-semibold text-emerald-800">Total ITC Available</span><span className="text-sm font-bold text-emerald-800">{formatINR(GSTR3B_SUMMARY.totalITC)}</span></div>
              </div>
            </Card>
          </div>

          <Card title="6.1 Payment of Tax" className="mt-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-royal-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">CGST Payable</p>
                <p className="text-lg font-bold text-royal-800">{formatINR(GSTR3B_SUMMARY.cgst)}</p>
              </div>
              <div className="bg-royal-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">SGST Payable</p>
                <p className="text-lg font-bold text-royal-800">{formatINR(GSTR3B_SUMMARY.sgst)}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">ITC Utilized</p>
                <p className="text-lg font-bold text-emerald-800">{formatINR(GSTR3B_SUMMARY.totalITC)}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Net Payable</p>
                <p className="text-lg font-bold text-amber-800">{formatINR(GSTR3B_SUMMARY.netTaxPayable)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'hsn' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total HSN Codes</p><p className="text-xl font-bold text-royal-600 mt-0.5">{HSN_DATA.length}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Taxable Value</p><p className="text-xl font-bold text-royal-600 mt-0.5">{formatINR(HSN_DATA.reduce((s, h) => s + h.taxableValue, 0))}</p></Card>
            <Card><p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Total Tax</p><p className="text-xl font-bold text-royal-800 mt-0.5">{formatINR(HSN_DATA.reduce((s, h) => s + h.cgstAmount + h.sgstAmount + h.igstAmount, 0))}</p></Card>
          </div>

          <Card title="HSN-wise Summary of Outward Supplies" className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">HSN Code</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">Description</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500">UQC</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Qty</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Taxable Value</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">CGST</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">SGST</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">IGST</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {HSN_DATA.map((h, i) => (
                    <tr key={h.hsnCode + i} className={`border-t border-gray-100 dark:border-white/[0.05] ${i % 2 === 0 ? 'bg-white dark:bg-[#1a1025]' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-2.5 font-mono font-medium text-royal-700">{h.hsnCode}</td>
                      <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{h.description}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 dark:text-gray-500">{h.uqc}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{h.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatINR(h.taxableValue)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(h.cgstAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatINR(h.sgstAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-orange-600">{formatINR(h.igstAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-royal-800">{formatINR(h.taxableValue + h.cgstAmount + h.sgstAmount + h.igstAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-royal-50 border-t-2 border-royal-200 font-semibold">
                    <td className="px-4 py-3 text-royal-800" colSpan={4}>Total</td>
                    <td className="px-4 py-3 text-right font-mono text-royal-800">{formatINR(HSN_DATA.reduce((s, h) => s + h.taxableValue, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatINR(HSN_DATA.reduce((s, h) => s + h.cgstAmount, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatINR(HSN_DATA.reduce((s, h) => s + h.sgstAmount, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600">{formatINR(HSN_DATA.reduce((s, h) => s + h.igstAmount, 0))}</td>
                    <td className="px-4 py-3 text-right font-mono text-royal-800">{formatINR(HSN_DATA.reduce((s, h) => s + h.taxableValue + h.cgstAmount + h.sgstAmount + h.igstAmount, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
