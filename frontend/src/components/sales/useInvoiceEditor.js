import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invoicesApi } from '../../api/invoices'
import { useAuth } from '../../context/AuthContext'

// Shared invoice-edit state + flow so the Sales tabs and every dedicated Sales
// page behave identically: role check, load the full invoice, invalidate the
// same queries after a save. Renders nothing; pair with <InvoiceEditModal>.
export function useInvoiceEditor({ onSaved } = {}) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canEdit = ['SUPER_ADMIN', 'MANAGER'].includes(user?.role?.name)
  const [invoice, setInvoice] = useState(null)
  const [open, setOpen] = useState(false)

  const openEditor = useCallback(
    async (inv) => {
      if (!canEdit) return alert('You do not have permission to edit invoices.')
      try {
        const r = await invoicesApi.get(inv.id)
        setInvoice(r.data.data)
        setOpen(true)
      } catch {
        alert('Could not load invoice details. Please try again.')
      }
    },
    [canEdit]
  )

  const closeEditor = useCallback(() => {
    setOpen(false)
    setInvoice(null)
  }, [])

  const handleSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    closeEditor()
    onSaved?.()
  }, [queryClient, closeEditor, onSaved])

  return { invoice, editorOpen: open, openEditor, closeEditor, handleSaved }
}