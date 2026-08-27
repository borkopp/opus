import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
  Button, Input, Label,
} from 'opus-dashboard-ui'

// Rendered open so the panel is visible in the static card.
export const EditService = () => (
  <Sheet defaultOpen>
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>Edit service</SheetTitle>
        <SheetDescription>Update the details clients see when booking.</SheetDescription>
      </SheetHeader>
      <div style={{ display: 'grid', gap: 14, padding: '0 16px' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <Label htmlFor="s-name">Name</Label>
          <Input id="s-name" defaultValue="Skin Fade" />
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <Label htmlFor="s-price">Price (£)</Label>
          <Input id="s-price" type="number" defaultValue={28} />
        </div>
      </div>
      <SheetFooter>
        <Button variant="terracotta">Save changes</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
)
