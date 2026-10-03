"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type {
  BusinessUsage,
  OwnerActivityKind,
  OwnerActivityPage,
  OwnerBookingStatus,
} from "../../../shared/owner-overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingStatus, dateTime } from "@/lib/format";
import { ActivityRecords } from "./activity-records";

export function BusinessActivity({
  businesses,
  selectedId,
  onSelect,
  refreshAt,
  onExpired,
}: {
  businesses: BusinessUsage[];
  selectedId: string;
  onSelect: (id: string) => void;
  refreshAt: number;
  onExpired: () => void;
}) {
  const [kind, setKind] = useState<OwnerActivityKind>("bookings");
  const [status, setStatus] = useState<OwnerBookingStatus | "all">("all");
  const [revision, setRevision] = useState(0);
  const business =
    businesses.find((row) => row.id === selectedId) ?? businesses[0];
  return (
    <Card id="business-activity" className="scroll-mt-5">
      <CardHeader>
        <CardTitle tabIndex={-1} id="business-activity-title">
          Business activity
        </CardTitle>
        <CardDescription>
          Inspect bookings, recorded changes and team sign-ins. All times use
          Skopje time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        {!business ? (
          <p className="text-sm text-muted-foreground">
            Activity will appear when a beauty business is created.
          </p>
        ) : (
          <>
            <FieldGroup className="flex flex-wrap gap-3 sm:flex-row">
              <Field className="min-w-0 flex-1">
                <FieldLabel htmlFor="activity-business">Business</FieldLabel>
                <NativeSelect
                  id="activity-business"
                  value={business.id}
                  onChange={(event) => onSelect(event.target.value)}
                >
                  {businesses.map((row) => (
                    <NativeSelectOption key={row.id} value={row.id}>
                      {row.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field className="w-auto">
                <FieldLabel htmlFor="activity-view">View</FieldLabel>
                <NativeSelect
                  id="activity-view"
                  value={kind}
                  onChange={(event) =>
                    setKind(event.target.value as OwnerActivityKind)
                  }
                >
                  <NativeSelectOption value="bookings">
                    Bookings
                  </NativeSelectOption>
                  <NativeSelectOption value="audit">
                    Audit history
                  </NativeSelectOption>
                  <NativeSelectOption value="team">
                    Team sign-ins
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
              {kind === "bookings" && (
                <Field className="w-auto">
                  <FieldLabel htmlFor="activity-status">
                    Booking status
                  </FieldLabel>
                  <NativeSelect
                    id="activity-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value as OwnerBookingStatus | "all",
                      )
                    }
                  >
                    <NativeSelectOption value="all">
                      All statuses
                    </NativeSelectOption>
                    {[
                      "confirmed",
                      "checked_in",
                      "completed",
                      "cancelled",
                      "no_show",
                    ].map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {bookingStatus(value)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              )}
            </FieldGroup>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-medium">
                {business.name} ·{" "}
                {kind === "audit"
                  ? "Audit history"
                  : kind === "team"
                    ? "Team sign-ins"
                    : "Bookings"}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevision((value) => value + 1)}
              >
                <RefreshCw data-icon="inline-start" />
                Refresh activity
              </Button>
            </div>
            <ActivityResults
              key={`${business.id}:${kind}:${status}:${revision}:${refreshAt}`}
              orgId={business.id}
              kind={kind}
              status={status}
              onExpired={onExpired}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {kind === "team"
                ? "Sign-in time comes from the newest retained auth session. Signed-out or removed sessions may be missing; this is not a complete login history. An unexpired session does not mean the person is online. Unlinked team seats cannot sign in."
                : kind === "audit"
                  ? "Only actions already written to the audit log appear here. Recognized changes are shown when recorded; arbitrary integration payloads are omitted. Price changes are recorded in minor units."
                  : "Newest records first. Client and service names reflect current records; price and appointment times come from the booking. Appointment value is not collected revenue. Older bookings may lack an individual creator."}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityResults({
  orgId,
  kind,
  status,
  onExpired,
}: {
  orgId: string;
  kind: OwnerActivityKind;
  status: OwnerBookingStatus | "all";
  onExpired: () => void;
}) {
  const [data, setData] = useState<OwnerActivityPage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState(0);
  const cursor = cursors[page];
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void fetch("/api/activity", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, kind, status, cursor }),
      signal,
    })
      .then(async (response) => {
        if (signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          onExpired();
          return;
        }
        if (!response.ok)
          throw new Error("Couldn’t load activity. Please try again.");
        const result: OwnerActivityPage = await response.json();
        if (!signal.aborted) setData(result);
      })
      .catch((cause: unknown) => {
        if (!signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Couldn’t load activity.",
          );
      })
      .finally(() => {
        if (!signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [orgId, kind, status, cursor, onExpired, retry]);
  if (busy)
    return (
      <div role="status" aria-label="Loading business activity">
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBusy(true);
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (!data) return null;
  const count = data[kind].length;
  return (
    <>
      {count ? (
        <>
          <ActivityRecords data={data} />
          <p className="text-xs text-muted-foreground sm:hidden">
            Swipe sideways to see all columns.
          </p>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {data.isDone && page === 0
            ? "No records available for this view."
            : "No visible records on this page. Continue to browse retained records."}
        </p>
      )}
      <div
        className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"
        role="status"
      >
        <p>
          {count} records · Page {page + 1} · Updated{" "}
          {dateTime(data.collectedAt)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => {
              setBusy(true);
              setPage((value) => value - 1);
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={data.isDone}
            onClick={() => {
              setBusy(true);
              setCursors([...cursors.slice(0, page + 1), data.continueCursor]);
              setPage((value) => value + 1);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
