import { Separator } from 'opus-dashboard-ui'

export const Horizontal = () => (
  <div style={{ maxWidth: 320 }}>
    <div style={{ fontWeight: 600 }}>Men's Haircut</div>
    <div style={{ fontSize: 13, opacity: 0.6 }}>30 min · £25</div>
    <Separator style={{ margin: '12px 0' }} />
    <div style={{ fontWeight: 600 }}>Beard Trim</div>
    <div style={{ fontSize: 13, opacity: 0.6 }}>15 min · £12</div>
  </div>
)

export const Vertical = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 32 }}>
    <span>Bookings</span>
    <Separator orientation="vertical" />
    <span>Staff</span>
    <Separator orientation="vertical" />
    <span>Services</span>
  </div>
)
