"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LockKeyhole, LogOut, RefreshCw } from "lucide-react";
import type { OwnerOverview } from "../../../shared/owner-overview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brand } from "./brand";
import { OverviewMetrics } from "./overview-metrics";
import { BusinessTable } from "./business-table";

export function OwnerDashboard({ email }: { email: string }) {
  const [data, setData] = useState<OwnerOverview | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const started = useRef(false);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/overview", {
        method: "POST",
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        setData(null);
        setExpired(true);
        throw new Error("Your session has ended. Please sign in again.");
      }
      if (!response.ok)
        throw new Error("Couldn’t refresh the overview. Please try again.");
      setData(await response.json());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn’t load the overview.",
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }, []);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refresh();
  }, [refresh]);

  async function signOut() {
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error();
      window.location.replace("/");
    } catch {
      setError("Couldn’t sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Brand />
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {email}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              <LogOut data-icon="inline-start" />
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Badge variant="outline">
              <LockKeyhole data-icon="inline-start" />
              Private workspace
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              The big picture.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your businesses, their progress, and what OPUS is using.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Button
              variant="outline"
              disabled={busy || expired}
              onClick={() => void refresh()}
            >
              <RefreshCw data-icon="inline-start" />
              {busy ? "Collecting overview…" : "Refresh overview"}
            </Button>
            <p className="text-xs text-muted-foreground" role="status">
              {data
                ? `Updated ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "Europe/Skopje" }).format(data.completedAt)} · Skopje`
                : "Fresh data each time you open or refresh."}
            </p>
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              <span>
                {error}{" "}
                {data &&
                  "The figures below are from the last successful refresh."}
              </span>
              {expired && (
                <Button asChild variant="link">
                  <Link href="/" prefetch={false}>
                    Sign in again
                  </Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {!data && busy && (
          <div
            className="flex flex-col gap-5"
            role="status"
            aria-label="Loading owner overview"
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-40 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
            <p className="text-sm text-muted-foreground">
              Counting businesses and checking file sizes. Larger accounts may
              take a moment.
            </p>
          </div>
        )}
        {data && (
          <>
            <OverviewMetrics data={data} />
            <BusinessTable businesses={data.businesses} />
            <details className="rounded-xl border bg-card p-5 text-xs leading-relaxed text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">
                How these numbers are counted
              </summary>
              <div className="mt-3 flex flex-col gap-2">
                <p>
                  Business figures include non-deleted beauty businesses.
                  Unclaimed imported listings are excluded. Published means the
                  saved website publication status; it is not a live uptime
                  check. Paid means the stored plan, not verified revenue.
                </p>
                <p>
                  Bookings include all non-deleted statuses. The 30-day window
                  uses booking creation time; cancellations are the currently
                  cancelled bookings within that group. Customers are records
                  per business, so one person visiting two studios can count
                  twice. Signup months use UTC and exclude deleted businesses.
                </p>
                <p>
                  Total file storage is every retained file in this Convex
                  deployment, including old, detached and legacy uploads. Linked
                  images include current logos, galleries, service photos and
                  staff/customer avatars. Files shared by businesses count once
                  in the overall linked total, but once per business in each
                  row. External image sizes are unknown.{" "}
                  {data.totals.missingImages > 0 &&
                    `${data.totals.missingImages} linked files could not be found in storage.`}
                </p>
                <p>
                  Storage uses decimal KB/MB/GB. These figures do not measure
                  bandwidth, database size or provider billing. Data is
                  collected in pages between{" "}
                  {new Date(data.startedAt).toLocaleTimeString("en-GB", {
                    timeZone: "Europe/Skopje",
                  })}{" "}
                  and{" "}
                  {new Date(data.completedAt).toLocaleTimeString("en-GB", {
                    timeZone: "Europe/Skopje",
                  })}
                  ; changes during collection may appear on the next refresh.
                </p>
              </div>
            </details>
          </>
        )}
        <footer className="pb-2 text-xs text-muted-foreground">
          OPUS Owner · Only visible to your account
        </footer>
      </main>
    </div>
  );
}
