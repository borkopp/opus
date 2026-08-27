import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Button, Input, Label,
} from 'opus-dashboard-ui'

// Rendered open so the panel is visible in the static card.
export const CancelBooking = () => (
  <Dialog defaultOpen>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Cancel this booking?</DialogTitle>
        <DialogDescription>
          Sofia will be notified by SMS. If a deposit was paid you can choose to refund it.
        </DialogDescription>
      </DialogHeader>
      <div style={{ display: 'grid', gap: 8 }}>
        <Label htmlFor="reason">Reason (optional)</Label>
        <Input id="reason" placeholder="e.g. client requested" />
      </div>
      <DialogFooter>
        <Button variant="outline">Keep booking</Button>
        <Button variant="destructive">Cancel booking</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
