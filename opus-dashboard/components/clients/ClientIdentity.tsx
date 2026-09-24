import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { clientInitials, type ClientRecord } from "@/lib/clients";

export function ClientIdentity({ client }: { client: ClientRecord }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar className="size-10 shrink-0">
        {client.avatarUrl && <AvatarImage src={client.avatarUrl} alt="" />}
        <AvatarFallback>{clientInitials(client.name)}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col gap-1 text-left">
        <span className="truncate font-medium">{client.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {client.email || client.phone || "—"}
        </span>
      </span>
    </span>
  );
}
