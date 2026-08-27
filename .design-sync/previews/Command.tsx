import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
  CommandSeparator, CommandShortcut,
} from 'opus-dashboard-ui'
import { CalendarPlus, UserPlus, Scissors, Settings } from 'lucide-react'

export const Palette = () => (
  <Command className="rounded-lg border shadow-md" style={{ maxWidth: 380 }}>
    <CommandInput placeholder="Type a command or search…" />
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Actions">
        <CommandItem><CalendarPlus /> New booking <CommandShortcut>⌘B</CommandShortcut></CommandItem>
        <CommandItem><UserPlus /> Add client <CommandShortcut>⌘N</CommandShortcut></CommandItem>
        <CommandItem><Scissors /> New service</CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Settings">
        <CommandItem><Settings /> Business settings</CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
)
