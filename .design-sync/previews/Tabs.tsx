import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from 'opus-dashboard-ui'

export const Default = () => (
  <Tabs defaultValue="upcoming" style={{ maxWidth: 420 }}>
    <TabsList>
      <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
      <TabsTrigger value="past">Past</TabsTrigger>
      <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
    </TabsList>
    <TabsContent value="upcoming" style={{ paddingTop: 12 }}>
      3 appointments scheduled today.
    </TabsContent>
    <TabsContent value="past" style={{ paddingTop: 12 }}>
      128 completed this month.
    </TabsContent>
    <TabsContent value="cancelled" style={{ paddingTop: 12 }}>
      2 cancellations this week.
    </TabsContent>
  </Tabs>
)

export const Line = () => (
  <Tabs defaultValue="details" style={{ maxWidth: 420 }}>
    <TabsList variant="line">
      <TabsTrigger value="details">Details</TabsTrigger>
      <TabsTrigger value="staff">Staff</TabsTrigger>
      <TabsTrigger value="pricing">Pricing</TabsTrigger>
    </TabsList>
    <TabsContent value="details" style={{ paddingTop: 12 }}>
      Service details and duration.
    </TabsContent>
  </Tabs>
)
