import { ToggleGroup, ToggleGroupItem } from 'opus-dashboard-ui'
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

export const SingleSelect = () => (
  <ToggleGroup type="single" defaultValue="center" variant="outline">
    <ToggleGroupItem value="left" aria-label="Left"><AlignLeft /></ToggleGroupItem>
    <ToggleGroupItem value="center" aria-label="Center"><AlignCenter /></ToggleGroupItem>
    <ToggleGroupItem value="right" aria-label="Right"><AlignRight /></ToggleGroupItem>
  </ToggleGroup>
)

export const MultiSelect = () => (
  <ToggleGroup type="multiple" defaultValue={['mon', 'wed', 'fri']}>
    <ToggleGroupItem value="mon">Mon</ToggleGroupItem>
    <ToggleGroupItem value="tue">Tue</ToggleGroupItem>
    <ToggleGroupItem value="wed">Wed</ToggleGroupItem>
    <ToggleGroupItem value="thu">Thu</ToggleGroupItem>
    <ToggleGroupItem value="fri">Fri</ToggleGroupItem>
  </ToggleGroup>
)
