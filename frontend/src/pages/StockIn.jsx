import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'

export default function StockIn() {
  return (
    <div>
      <PageHeader title="Stock Transfer" subtitle="Transfer stock between warehouse locations" />
      <Card>
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-sm">Stock transfer module — Coming soon</p>
        </div>
      </Card>
    </div>
  )
}
