import { Alert, AlertTitle, AlertDescription } from 'opus-dashboard-ui'
import { CircleCheck, TriangleAlert } from 'lucide-react'

export const Default = () => (
  <Alert style={{ maxWidth: 420 }}>
    <CircleCheck />
    <AlertTitle>Booking confirmed</AlertTitle>
    <AlertDescription>
      We've sent Sofia a confirmation by SMS and email.
    </AlertDescription>
  </Alert>
)

export const Destructive = () => (
  <Alert variant="destructive" style={{ maxWidth: 420 }}>
    <TriangleAlert />
    <AlertTitle>Booking conflict</AlertTitle>
    <AlertDescription>
      The selected time is no longer available. Choose another slot.
    </AlertDescription>
  </Alert>
)
