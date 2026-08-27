import { ScrollArea, Separator } from 'opus-dashboard-ui'

const services = [
  'Men’s Haircut', 'Skin Fade', 'Beard Trim', 'Hot Towel Shave',
  'Cut & Blow Dry', 'Kids Cut', 'Restyle', 'Colour', 'Highlights', 'Treatment',
]

export const ServiceList = () => (
  <ScrollArea className="h-48 w-64 rounded-md border">
    <div style={{ padding: 12 }}>
      <div className="micro-label" style={{ marginBottom: 8, opacity: 0.6 }}>SERVICES</div>
      {services.map((s, i) => (
        <div key={s}>
          <div style={{ padding: '6px 0', fontSize: 14 }}>{s}</div>
          {i < services.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  </ScrollArea>
)
