import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { bankAccountsApi } from '../api/bankAccounts'

// Keep in sync with BANK_ACCOUNT_TYPES in backend/src/validators/bankAccount.validator.js
const ACCOUNT_TYPES = ['Current', 'Savings', 'Cash Credit', 'Overdraft']

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white dark:bg-[#1a1025] px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-royal-500'

const fromAccount = (a) => ({
  name: a?.name || '',
  bank: a?.bank || '',
  accountNumber: a?.accountNumber || '',
  ifsc: a?.ifsc || '',
  type: ACCOUNT_TYPES.includes(a?.type) ? a.type : 'Current',
  openingBalance: a?.openingBalance ?? 0,
  openingDate: a?.openingDate ? String(a.openingDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
  balance: a?.balance ?? a?.currentBalance ?? 0,
})

// Edit a bank account from a page other than Bank Accounts (General Ledger).
// Only the account's own details are editable here - its balance is maintained by
// payments, expenses and purchase orders on the Bank Accounts page.
export default function BankAccountEditModal({ open, account, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => fromAccount(account))
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(fromAccount(account))
      setError('')
    }
  }, [open, account])

  const save = useMutation({
    mutationFn: () =>
      bankAccountsApi.update(account.id, {
        name: form.name,
        bank: form.bank,
        accountNumber: form.accountNumber,
        ifsc: form.ifsc,
        type: form.type,
        openingBalance: Number(form.openingBalance) || 0,
        openingDate: form.openingDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['ledger-trial'] })
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      onClose()
    },
    onError: (e) => {
      const msg = e?.response?.data?.message || 'Could not save this account'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    },
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (String(form.ifsc).trim().length !== 11) {
      setError('IFSC must be exactly 11 characters')
      return
    }
    save.mutate()
  }

  return (
    <Modal
      open={open}
      title="Edit Bank Account"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Update'}</Button>
        </>
      }
    >
      {account && (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
            This ledger row is backed by a bank account. Balances are adjusted by payments, expenses and purchase orders, so they are changed on the Bank Accounts page.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name *</label>
              <input type="text" value={form.name} onChange={set('name')} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank *</label>
              <input type="text" value={form.bank} onChange={set('bank')} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Type *</label>
              <select value={form.type} onChange={set('type')} className={inputCls} required>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opening Date *</label>
              <input type="date" value={form.openingDate} onChange={set('openingDate')} className={inputCls} required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number *</label>
              <input type="text" value={form.accountNumber} onChange={set('accountNumber')} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IFSC Code *</label>
              <input type="text" value={form.ifsc} onChange={set('ifsc')} className={`${inputCls} uppercase`} required />
              <p className="text-[11px] text-gray-400 mt-1">11 characters, e.g. HDFC0001234</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opening Balance</label>
              <input type="number" step="0.01" value={form.openingBalance} onChange={set('openingBalance')} className={inputCls} />
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}