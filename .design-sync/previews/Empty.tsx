import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent, Button,
} from 'opus-dashboard-ui'
import { CalendarX, Plus } from 'lucide-react'

export const NoBookings = () => (
  <Empty style={{ maxWidth: 380 }}>
    <EmptyHeader>
      <EmptyMedia variant="icon"><CalendarX /></EmptyMedia>
      <EmptyTitle>No bookings yet</EmptyTitle>
      <EmptyDescription>
        When clients book online they'll appear here. You can also add one manually.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button variant="terracotta"><Plus /> Add booking</Button>
    </EmptyContent>
  </Empty>
)
