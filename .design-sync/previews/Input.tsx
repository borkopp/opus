import { Input, Label } from 'opus-dashboard-ui'

export const Default = () => (
  <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
    <Label htmlFor="name">Client name</Label>
    <Input id="name" placeholder="e.g. Sofia Petrov" defaultValue="Sofia Petrov" />
  </div>
)

export const Types = () => (
  <div style={{ display: 'grid', gap: 14, maxWidth: 320 }}>
    <Input type="email" placeholder="client@email.com" />
    <Input type="tel" placeholder="+44 7700 900123" />
    <Input type="number" placeholder="Party size" defaultValue={2} />
  </div>
)

export const States = () => (
  <div style={{ display: 'grid', gap: 14, maxWidth: 320 }}>
    <Input placeholder="Default" />
    <Input placeholder="Disabled" disabled />
    <Input placeholder="Invalid" aria-invalid defaultValue="not-an-email" />
  </div>
)
