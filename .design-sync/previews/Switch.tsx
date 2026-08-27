import { Switch, Label } from 'opus-dashboard-ui'

export const States = () => (
  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
    <Switch defaultChecked />
    <Switch />
    <Switch defaultChecked disabled />
    <Switch disabled />
  </div>
)

export const WithLabel = () => (
  <div style={{ display: 'grid', gap: 14 }}>
    <Label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Switch defaultChecked /> Accept online bookings
    </Label>
    <Label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Switch /> Require deposit at booking
    </Label>
  </div>
)
