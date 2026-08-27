import { Label, Input, Checkbox } from 'opus-dashboard-ui'

export const Default = () => (
  <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
    <Label htmlFor="email">Email address</Label>
    <Input id="email" type="email" placeholder="client@email.com" />
  </div>
)

export const WithControl = () => (
  <Label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
    <Checkbox defaultChecked /> Send appointment reminders
  </Label>
)
