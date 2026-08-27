import { Badge } from 'opus-dashboard-ui'
import { Check, Clock, X } from 'lucide-react'

export const Variants = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
    <Badge variant="default">Confirmed</Badge>
    <Badge variant="secondary">Pending</Badge>
    <Badge variant="destructive">Cancelled</Badge>
    <Badge variant="outline">Draft</Badge>
    <Badge variant="ghost">Archived</Badge>
    <Badge variant="link">Details</Badge>
  </div>
)

export const StatusWithIcons = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
    <Badge variant="default"><Check /> Paid</Badge>
    <Badge variant="secondary"><Clock /> Awaiting deposit</Badge>
    <Badge variant="destructive"><X /> No-show</Badge>
  </div>
)
