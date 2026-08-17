import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { Input, Select, Label } from '../ui/FormControls'
import { productsApi } from '../../api/products'
import { inventoryApi } from '../../api/inventory'

// Shared form for Stock In / Stock Out.
// mode: "in" adds stock, "out" removes it.
export default function StockChangeForm({ mode }) {
  const queryClient = useQueryClient()
  const isIn = mode === 'in'

  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list({ isActive: 'true' }).then((r) => r.data.data),
  })

  const mutation = useMutation({
    mutationFn: () =>
      isIn
        ? inventoryApi.stockIn({ productId: Number(productId), quantity: Number(quantity), note: note || undefined })
        : inventoryApi.stockOut({ productId: Number(productId), quantity: Number(quantity), note: note || undefined }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setResult(`Done! Stock is now ${res.data.data.quantity} (was ${res.data.data.previous}).`)
      setError('')
      setQuantity('')
      setNote('')
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to update stock')
      setResult('')
    },
  })

  return (
    <Card title={isIn ? 'Add Stock' : 'Remove Stock'}>
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>
      )}
      {result && (
        <div className="mb-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg px-4 py-3 border border-emerald-200">{result}</div>
      )}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <div>
          <Label htmlFor="product">Product</Label>
          <Select id="product" value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">Select product...</option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — in stock: {p.inventory?.quantity ?? 0}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="qty">Quantity</Label>
          <Input
            id="qty"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 5"
            required
          />
        </div>

        <div>
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isIn ? 'e.g. Supplier delivery' : 'e.g. Damaged / manual sale'}
          />
        </div>

        <Button type="submit" variant={isIn ? 'primary' : 'danger'} disabled={mutation.isPending}>
          {mutation.isPending ? 'Updating...' : isIn ? 'Add Stock' : 'Remove Stock'}
        </Button>
      </form>
    </Card>
  )
}
