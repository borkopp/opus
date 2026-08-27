import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel,
  SelectItem, SelectSeparator,
} from 'opus-dashboard-ui'

// Rendered open so the listbox is visible in the static card.
export const StaffPicker = () => (
  <Select defaultOpen defaultValue="marco">
    <SelectTrigger style={{ width: 220 }}>
      <SelectValue placeholder="Assign staff" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Barbers</SelectLabel>
        <SelectItem value="marco">Marco Rossi</SelectItem>
        <SelectItem value="aiden">Aiden Jones</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Stylists</SelectLabel>
        <SelectItem value="sofia">Sofia Petrov</SelectItem>
        <SelectItem value="lena">Lena Marković</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
)
