import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, Button,
} from 'opus-dashboard-ui'
import { Pencil, Copy, Trash2, MoreHorizontal } from 'lucide-react'

// Rendered open so the menu is visible in the static card.
export const BookingActions = () => (
  <DropdownMenu defaultOpen>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon"><MoreHorizontal /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuLabel>Booking</DropdownMenuLabel>
      <DropdownMenuItem><Pencil /> Reschedule <DropdownMenuShortcut>⌘R</DropdownMenuShortcut></DropdownMenuItem>
      <DropdownMenuItem><Copy /> Duplicate</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive"><Trash2 /> Cancel booking</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
