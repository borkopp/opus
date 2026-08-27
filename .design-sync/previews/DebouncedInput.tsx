import { DebouncedInput, Label } from 'opus-dashboard-ui'

// DebouncedInput is controlled: it owns local state and fires onChange after
// `debounceMs`. The preview renders a static value; onChange is a no-op.
export const Default = () => (
  <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
    <Label htmlFor="search">Search clients</Label>
    <DebouncedInput
      id="search"
      value="Sofia"
      onChange={() => {}}
      placeholder="Type to filter…"
    />
  </div>
)
