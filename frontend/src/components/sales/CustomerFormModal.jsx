import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { Label, Input } from '../ui/FormControls'
import { customersApi } from '../../api/customers'

// Shared add/edit customer modal used by the Sales "Customers" tab and the
// dedicated Customers page (identical form so behaviour matches everywhere).
export default function CustomerFormModal({ open, customer, onClose, onSaved }) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(customer?.id)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? customersApi.update(customer.id, form)
        : customersApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onSaved?.()
      onClose()
    },
  })

  const handleOpen = () => {
    setForm({
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: customer?.address || '',
    })
  }

  useEffect(() => {
    if (open) handleOpen()
  }, [open, customer?.id])

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit Customer' : 'Add Customer'}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.name.trim()}
            loading={saveMutation.isPending}
          >
            {isEdit ? 'Save Changes' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="customer-form-name">Name</Label>
          <Input
            id="customer-form-name"
            placeholder="Customer name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="customer-form-phone">Phone</Label>
          <Input
            id="customer-form-phone"
            type="tel"
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="customer-form-email">Email</Label>
          <Input
            id="customer-form-email"
            type="email"
            placeholder="customer@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="customer-form-address">Address</Label>
          <Input
            id="customer-form-address"
            placeholder="Customer address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        {saveMutation.isError && (
          <p className="text-sm text-red-600">{saveMutation.error?.response?.data?.message || 'Failed to save customer.'}</p>
        )}
      </div>
    </Modal>
  )
}