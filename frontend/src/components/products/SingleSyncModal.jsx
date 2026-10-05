import Modal from '../ui/Modal'
import Button from '../ui/Button'
import ProductUpdateProgress from './ProductUpdateProgress'

// Streams the live per-step result of pushing one product to Shopify. Reuses the
// same step tracker the edit form shows, so a manual "Sync" reads identically to
// saving a product.
export default function SingleSyncModal({ open, product, onClose, onComplete }) {
  return (
    <Modal
      open={open}
      title={product ? `Sync ${product.name}` : 'Sync to Shopify'}
      onClose={onClose}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {product && (
        <ProductUpdateProgress
          key={product.id}
          product={product}
          onComplete={onComplete}
        />
      )}
    </Modal>
  )
}