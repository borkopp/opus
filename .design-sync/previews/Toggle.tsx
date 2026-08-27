import { Toggle } from 'opus-dashboard-ui'
import { Bold, Italic, Star } from 'lucide-react'

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Toggle aria-label="Bold" defaultPressed><Bold /></Toggle>
    <Toggle aria-label="Italic"><Italic /></Toggle>
    <Toggle variant="outline" aria-label="Featured"><Star /> Featured</Toggle>
  </div>
)

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Toggle size="sm" aria-label="Small"><Bold /></Toggle>
    <Toggle size="default" aria-label="Default"><Bold /></Toggle>
    <Toggle size="lg" aria-label="Large"><Bold /></Toggle>
  </div>
)
