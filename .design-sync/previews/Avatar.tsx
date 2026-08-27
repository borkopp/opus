import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from 'opus-dashboard-ui'

export const ImageAndFallback = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/96?img=12" alt="Marco" />
      <AvatarFallback>MR</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>SP</AvatarFallback>
    </Avatar>
    <Avatar className="size-12">
      <AvatarFallback>AJ</AvatarFallback>
    </Avatar>
  </div>
)

export const Group = () => (
  <AvatarGroup>
    <Avatar><AvatarFallback>MR</AvatarFallback></Avatar>
    <Avatar><AvatarFallback>SP</AvatarFallback></Avatar>
    <Avatar><AvatarFallback>AJ</AvatarFallback></Avatar>
    <AvatarGroupCount>+4</AvatarGroupCount>
  </AvatarGroup>
)
