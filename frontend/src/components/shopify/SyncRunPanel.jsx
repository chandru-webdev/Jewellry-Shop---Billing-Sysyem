import { X } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import SyncOutcomeRows from './SyncOutcomeRows'

// Persistent per-item result panel shown after a sync finishes, so the outcome
// stays on screen instead of disappearing with the progress modal.
export default function SyncRunPanel({ title = 'Last sync run', run, onDismiss, emptyText }) {
  if (!run) return null
  const ok = run.summary?.ok ?? 0
  const failed = run.summary?.failed ?? 0
  const total = run.summary?.total
  const subtitle = `${ok} ok${failed ? `, ${failed} failed` : ''}${typeof total === 'number' ? ` of ${total}` : ''}`
  return (
    <Card
      className="mb-4"
      title={`${title} — ${subtitle}`}
      action={
        <div className="flex items-center gap-2">
          {run.at && <span className="text-[11px] text-gray-400">{new Date(run.at).toLocaleString()}</span>}
          <Badge tone={run.status === 'failed' ? 'red' : 'green'}>{run.status === 'failed' ? 'Failed' : 'Complete'}</Badge>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X size={14} />
            </Button>
          )}
        </div>
      }
    >
      <SyncOutcomeRows items={run.steps} emptyText={emptyText} />
    </Card>
  )
}
