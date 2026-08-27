import { Button } from 'opus-dashboard-ui'
import { Plus, CalendarDays, Trash2, Check } from 'lucide-react'

export const Variants = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
    <Button variant="default">Save changes</Button>
    <Button variant="terracotta">Book appointment</Button>
    <Button variant="secondary">Reschedule</Button>
    <Button variant="outline">Cancel</Button>
    <Button variant="ghost">Dismiss</Button>
    <Button variant="destructive">Delete</Button>
    <Button variant="link">View details</Button>
  </div>
)

export const Sizes = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
    <Button size="xs" variant="terracotta">Extra small</Button>
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
  </div>
)

export const WithIcons = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
    <Button variant="terracotta"><Plus /> New booking</Button>
    <Button variant="outline"><CalendarDays /> Schedule</Button>
    <Button variant="secondary"><Check /> Confirm</Button>
    <Button size="icon" variant="ghost"><Trash2 /></Button>
  </div>
)

export const States = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
    <Button variant="terracotta">Enabled</Button>
    <Button variant="terracotta" disabled>Disabled</Button>
  </div>
)
