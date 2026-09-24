import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import SaleEditForm from '../SaleEditForm'
import { invoiceStatusLabel } from './statusMaps'

// Shared invoice-edit flow used by every Sales list (tabs + dedicated pages):
// finalized invoices ask for confirmation, drafts go straight to the form.
// The parent loads the full invoice (with items) before opening this.
export default function InvoiceEditModal({ open, invoice, onClose, onSaved }) {
  const [stage, setStage] = useState('edit')

  useEffect(() => {
    if (open) setStage(invoice?.status === 'DRAFT' ? 'edit' : 'confirm')
  }, [open, invoice?.status, invoice?.id])

  const cancelConfirm = () => {
    setStage('edit')
    onClose()
  }

  return (
    <>
      <Modal
        open={open && stage === 'confirm'}
        title={`Edit ${invoice?.invoiceNumber || 'invoice'}?`}
        onClose={cancelConfirm}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={cancelConfirm}>Cancel</Button>
            <Button size="sm" onClick={() => setStage('edit')}>Proceed</Button>
          </>
        }
      >
        <div className="text-sm space-y-3">
          <p>
            This invoice is already{' '}
            <span className="font-semibold text-royal-950 dark:text-white">
              "{invoiceStatusLabel[invoice?.status] || invoice?.status}"
            </span>
            .
          </p>
          <p>Changing line items, quantities, or amounts on a finalized invoice may affect:</p>
          <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 space-y-1">
            <li>Accounting records and tax reports</li>
            <li>Stock/inventory levels</li>
            <li>Payment reconciliation and customer balances</li>
            <li>GST/GSTR-1/GSTR-3B summaries</li>
          </ul>
          <p className="font-medium text-royal-950 dark:text-white">Are you sure you want to proceed?</p>
        </div>
      </Modal>

      <Modal
        open={open && stage === 'edit'}
        title={`Edit Invoice ${invoice?.invoiceNumber || ''}`}
        onClose={onClose}
        size="xl"
      >
        {invoice && <SaleEditForm invoice={invoice} onCancel={onClose} onSaved={onSaved} />}
      </Modal>
    </>
  )
}