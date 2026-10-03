import type { OwnerActivityPage } from "../../../shared/owner-overview";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  appointmentValue,
  bookingSource,
  bookingStatus,
  dateTime,
} from "@/lib/format";

export function ActivityRecords({ data }: { data: OwnerActivityPage }) {
  if (data.kind === "bookings")
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Client / details",
              "Appointment",
              "Booked through",
              "Created by",
              "Status / value",
            ].map((label) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="align-top">
                <p className="font-medium">{booking.customer.name}</p>
                <details className="mt-2 max-w-80 whitespace-normal text-xs">
                  <summary className="cursor-pointer text-primary">
                    View booking details
                  </summary>
                  <dl className="mt-3 grid gap-2 break-words">
                    <div>
                      <dt className="text-muted-foreground">Client contact</dt>
                      <dd>
                        {booking.customer.email ?? "Email not recorded"}
                        <br />
                        {booking.customer.phone ?? "Phone not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Created</dt>
                      <dd>{dateTime(booking.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last updated</dt>
                      <dd>{dateTime(booking.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Ends</dt>
                      <dd>{dateTime(booking.endAt)}</dd>
                    </div>
                    {booking.cancellationReason && (
                      <div>
                        <dt className="text-muted-foreground">
                          Cancellation reason
                        </dt>
                        <dd>{booking.cancellationReason}</dd>
                      </div>
                    )}
                    {booking.customerNote && (
                      <div>
                        <dt className="text-muted-foreground">Client note</dt>
                        <dd>{booking.customerNote}</dd>
                      </div>
                    )}
                    {booking.staffNote && (
                      <div>
                        <dt className="text-muted-foreground">Staff note</dt>
                        <dd>{booking.staffNote}</dd>
                      </div>
                    )}
                    {booking.recoveryOffer && (
                      <div>
                        <dt className="text-muted-foreground">Recovery</dt>
                        <dd>Booked from an opening offer</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">
                        Booking reference
                      </dt>
                      <dd className="break-all">{booking.id}</dd>
                    </div>
                  </dl>
                </details>
              </TableCell>
              <TableCell className="align-top">
                <p>{dateTime(booking.startAt)}</p>
                <p className="mt-1 max-w-64 whitespace-normal text-xs text-muted-foreground">
                  {booking.services.join(" + ")} · {booking.staff}
                </p>
              </TableCell>
              <TableCell className="align-top">
                {bookingSource(booking.source)}
              </TableCell>
              <TableCell className="max-w-52 whitespace-normal align-top">
                {booking.createdBy}
              </TableCell>
              <TableCell className="align-top">
                <Badge
                  variant={
                    booking.status === "cancelled" ||
                    booking.status === "no_show"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {bookingStatus(booking.status)}
                </Badge>
                <p className="mt-2 tabular-nums">
                  {appointmentValue(booking.priceMinorUnits, booking.currency)}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  if (data.kind === "audit")
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {["Recorded", "Action / changes", "Actor", "Resource"].map(
              (label) => (
                <TableHead key={label}>{label}</TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.audit.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="align-top">
                {dateTime(entry.createdAt)}
              </TableCell>
              <TableCell className="align-top">
                <p className="font-medium">{entry.action}</p>
                {entry.changes.length > 0 && (
                  <details className="mt-2 max-w-80 whitespace-normal text-xs">
                    <summary className="cursor-pointer text-primary">
                      View recorded changes
                    </summary>
                    <dl className="mt-3 grid gap-2">
                      {entry.changes.map((change) => (
                        <div key={change.field}>
                          <dt className="text-muted-foreground">
                            {change.field}
                          </dt>
                          <dd className="break-words">
                            {formatChange(change.field, change.before)} →{" "}
                            {formatChange(change.field, change.after)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </TableCell>
              <TableCell className="max-w-64 whitespace-normal align-top">
                <p>{entry.actor}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.actorType}
                </p>
              </TableCell>
              <TableCell className="align-top">
                <p>{entry.resourceType}</p>
                <p className="mt-1 max-w-48 break-all whitespace-normal text-xs text-muted-foreground">
                  {entry.resourceId}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {[
            "Team member",
            "Role / access",
            "Latest retained sign-in",
            "Session state",
          ].map((label) => (
            <TableHead key={label}>{label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.team.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <p className="font-medium">{member.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {member.email ?? "No linked account"}
              </p>
            </TableCell>
            <TableCell>
              <p className="capitalize">{member.role}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {member.active ? "Active member" : "Inactive member"}
              </p>
            </TableCell>
            <TableCell>
              {member.latestRetainedSignInAt !== null
                ? dateTime(member.latestRetainedSignInAt)
                : member.linkedAccount
                  ? "No retained session"
                  : "No linked account"}
            </TableCell>
            <TableCell>
              <p>
                {member.sessionExpiresAt !== null
                  ? member.sessionExpiresAt > data.collectedAt
                    ? "Unexpired session"
                    : "Expired session"
                  : "Unavailable"}
              </p>
              {member.sessionExpiresAt !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Expires {dateTime(member.sessionExpiresAt)}
                </p>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatChange(field: string, value: string | null): string {
  if (value === null) return "Not recorded";
  if (
    (field === "startAt" || field === "endAt") &&
    Number.isFinite(new Date(Number(value)).getTime())
  )
    return dateTime(Number(value));
  return value;
}
