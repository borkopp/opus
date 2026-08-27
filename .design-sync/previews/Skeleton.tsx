import { Skeleton } from 'opus-dashboard-ui'

export const Shapes = () => (
  <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
    <Skeleton style={{ height: 16, width: '60%' }} />
    <Skeleton style={{ height: 16, width: '80%' }} />
    <Skeleton style={{ height: 16, width: '40%' }} />
  </div>
)

export const CardLoading = () => (
  <div style={{ display: 'flex', gap: 14, alignItems: 'center', maxWidth: 320 }}>
    <Skeleton style={{ height: 48, width: 48, borderRadius: 9999 }} />
    <div style={{ display: 'grid', gap: 8, flex: 1 }}>
      <Skeleton style={{ height: 14, width: '70%' }} />
      <Skeleton style={{ height: 14, width: '45%' }} />
    </div>
  </div>
)
