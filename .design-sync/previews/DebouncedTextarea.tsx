import { DebouncedTextarea, Label } from 'opus-dashboard-ui'

// Controlled like DebouncedInput — fires onChange after a debounce. The preview
// shows a static value; onChange is a no-op.
export const Default = () => (
  <div style={{ display: 'grid', gap: 8, maxWidth: 380 }}>
    <Label htmlFor="bio">Stylist bio</Label>
    <DebouncedTextarea
      id="bio"
      value="Senior barber with 8 years' experience in classic cuts and skin fades."
      onChange={() => {}}
      rows={3}
    />
  </div>
)
