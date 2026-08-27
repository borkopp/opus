import { Textarea, Label } from 'opus-dashboard-ui'

export const Default = () => (
  <div style={{ display: 'grid', gap: 8, maxWidth: 380 }}>
    <Label htmlFor="notes">Appointment notes</Label>
    <Textarea
      id="notes"
      rows={4}
      defaultValue="Prefers a fade on the sides. Allergic to standard hold spray — use the fragrance-free range."
    />
  </div>
)

export const States = () => (
  <div style={{ display: 'grid', gap: 14, maxWidth: 380 }}>
    <Textarea placeholder="Leave a note for the stylist…" rows={3} />
    <Textarea placeholder="Disabled" rows={3} disabled />
  </div>
)
