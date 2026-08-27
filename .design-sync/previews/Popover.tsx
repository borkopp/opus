import {
  Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription,
  Button, Label, Input,
} from 'opus-dashboard-ui'

// Rendered open so the content is visible in the static card.
export const QuickEdit = () => (
  <Popover defaultOpen>
    <PopoverTrigger asChild>
      <Button variant="outline">Adjust hours</Button>
    </PopoverTrigger>
    <PopoverContent align="start">
      <PopoverHeader>
        <PopoverTitle>Working hours</PopoverTitle>
        <PopoverDescription>Set when this stylist is available.</PopoverDescription>
      </PopoverHeader>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <Label htmlFor="from">From</Label>
          <Input id="from" type="time" defaultValue="09:00" />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <Label htmlFor="to">To</Label>
          <Input id="to" type="time" defaultValue="17:30" />
        </div>
      </div>
    </PopoverContent>
  </Popover>
)
