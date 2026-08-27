import {
  InputGroup, InputGroupInput, InputGroupAddon, InputGroupText, InputGroupButton,
} from 'opus-dashboard-ui'
import { Search, X } from 'lucide-react'

export const WithIcon = () => (
  <InputGroup style={{ maxWidth: 320 }}>
    <InputGroupAddon>
      <Search />
    </InputGroupAddon>
    <InputGroupInput placeholder="Search clients…" defaultValue="Sofia" />
    <InputGroupAddon align="inline-end">
      <InputGroupButton size="icon-xs" aria-label="Clear"><X /></InputGroupButton>
    </InputGroupAddon>
  </InputGroup>
)

export const WithText = () => (
  <InputGroup style={{ maxWidth: 320 }}>
    <InputGroupAddon>
      <InputGroupText>£</InputGroupText>
    </InputGroupAddon>
    <InputGroupInput type="number" defaultValue={25} />
    <InputGroupAddon align="inline-end">
      <InputGroupText>per service</InputGroupText>
    </InputGroupAddon>
  </InputGroup>
)
