import {
  Card, CardHeader, CardTitle, CardDescription, CardAction,
  CardContent, CardFooter, Button, Badge,
} from 'opus-dashboard-ui'

export const BookingSummary = () => (
  <Card style={{ maxWidth: 360 }}>
    <CardHeader>
      <CardTitle>Today's bookings</CardTitle>
      <CardDescription>Tuesday, 30 June</CardDescription>
      <CardAction>
        <Badge variant="secondary">12 booked</Badge>
      </CardAction>
    </CardHeader>
    <CardContent>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Revenue so far</span>
        <span className="font-display" style={{ fontWeight: 600 }}>£480</span>
      </div>
    </CardContent>
    <CardFooter style={{ gap: 8 }}>
      <Button variant="terracotta">New booking</Button>
      <Button variant="outline">View schedule</Button>
    </CardFooter>
  </Card>
)

export const Simple = () => (
  <Card style={{ maxWidth: 320 }}>
    <CardHeader>
      <CardTitle>Deposit required</CardTitle>
      <CardDescription>A 20% deposit secures this appointment.</CardDescription>
    </CardHeader>
    <CardContent>£5.00 due now · £20.00 on the day</CardContent>
  </Card>
)
