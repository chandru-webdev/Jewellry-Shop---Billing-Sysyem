import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'

export default function StockOut() {
  return (
    <div>
      <PageHeader title="Barcode / Labels" subtitle="Generate barcodes and labels for products" />
      <Card>
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-sm">Barcode generation module — Coming soon</p>
        </div>
      </Card>
    </div>
  )
}
