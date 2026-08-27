import { Spinner, Button } from 'opus-dashboard-ui'

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
    <Spinner className="size-4" />
    <Spinner className="size-6" />
    <Spinner className="size-8 text-accent" />
  </div>
)

export const InButton = () => (
  <Button variant="terracotta" disabled>
    <Spinner /> Saving…
  </Button>
)
