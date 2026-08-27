import { Progress } from 'opus-dashboard-ui'

export const Levels = () => (
  <div style={{ display: 'grid', gap: 18, maxWidth: 360 }}>
    <Progress value={25} />
    <Progress value={60} />
    <Progress value={100} />
  </div>
)

export const Labelled = () => (
  <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span>Monthly booking target</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>72%</span>
    </div>
    <Progress value={72} />
  </div>
)
