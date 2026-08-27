import { Checkbox, Label } from 'opus-dashboard-ui'

export const States = () => (
  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
    <Checkbox defaultChecked />
    <Checkbox />
    <Checkbox defaultChecked disabled />
    <Checkbox disabled />
  </div>
)

export const Checklist = () => (
  <div style={{ display: 'grid', gap: 12 }}>
    <Label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Checkbox defaultChecked /> Haircut
    </Label>
    <Label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Checkbox defaultChecked /> Beard trim
    </Label>
    <Label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Checkbox /> Hot towel finish
    </Label>
  </div>
)
