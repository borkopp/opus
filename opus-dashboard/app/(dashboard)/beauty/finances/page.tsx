"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
import { IconWallet, IconBuildingBank, IconAlertTriangle, IconLock, IconChartPie } from "@tabler/icons-react";
import { Price } from "@/components/ui/price";
import { ACTIVE_CAPABILITIES } from "@/lib/product-scope";

function DormantFinancesPage() {
  const profile = useQuery(api.users.getMyProfile);
  const router = useRouter();

  useEffect(() => {
    if (
      profile === null ||
      (profile && profile.role !== "owner" && profile.role !== "manager")
    ) {
      router.push("/beauty");
    }
  }, [profile, router]);

  const orgId = profile?.orgId;

  const summary = useQuery(
    api.payouts.getPayoutSummary.getPayoutSummary,
    orgId ? { orgId } : "skip",
  );
  const payouts = useQuery(
    api.payouts.listPayouts.listPayouts,
    orgId ? { orgId } : "skip",
  );
  const splitConfigs = useQuery(
    api.payouts.listSplitConfigs.listSplitConfigs,
    orgId ? { orgId } : "skip",
  );

  if (
    profile === undefined ||
    summary === undefined ||
    payouts === undefined ||
    splitConfigs === undefined
  ) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!orgId) return null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto pb-10">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-semibold font-display tracking-tight text-foreground flex items-baseline gap-3">
            Finances & Payouts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your organization&apos;s earnings, payouts, and revenue splits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content Area (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-8">

          {/* Overview Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/20 dark:to-green-900/10 border-emerald-200 dark:border-emerald-900 relative overflow-hidden group hover:shadow-md  transition-shadow">
              <IconWallet className="absolute right-0 bottom-0 text-emerald-500/10 w-24 h-24 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Total Settled
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  <Price amount={summary.totalEarned} />
                </div>
                <p className="text-xs mb-4 text-emerald-600/80 dark:text-emerald-500/80 mt-1 font-medium">
                  Successfully settled and paid out.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/20 dark:to-orange-900/10 border-amber-200 dark:border-amber-900 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <IconBuildingBank className="absolute right-0 bottom-0 text-amber-500/10 w-24 h-24 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Pending Transit
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                  <Price amount={summary.pending} />
                </div>
                <p className="text-xs mb-4 text-amber-600/80 dark:text-amber-500/80 mt-1 font-medium">
                  Collected but not yet settled.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950/20 dark:to-rose-900/10 border-red-200 dark:border-red-900 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <IconAlertTriangle className="absolute right-0 bottom-0 text-red-500/10 w-24 h-24 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
                  Failed or Refunded
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                  <Price amount={summary.failed} />
                </div>
                <p className="text-xs mb-4 text-red-600/80 dark:text-red-500/80 mt-1 font-medium">
                  Transactions with errors.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Table */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/20 pt-5 px-6">
              <CardTitle className="text-lg">Payout Ledger</CardTitle>
              <CardDescription>
                Chronological record of individual splits transferred to staff and owners.
              </CardDescription>
            </CardHeader>
            <div className="p-0 -mt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[180px] pl-6 font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Recipient Phase</TableHead>
                    <TableHead className="font-semibold">Destination ACCT</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right pr-6 font-semibold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-[300px] text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <IconWallet className="h-10 w-10 text-muted-foreground/30" stroke={1.5} />
                          <p>No payouts have been recorded yet.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payout) => (
                      <TableRow key={payout._id} className="group hover:bg-muted/10">
                        <TableCell className="font-medium whitespace-nowrap text-muted-foreground pl-6">
                          <span className="text-foreground">{format(payout.createdAt, "MMM d, yyyy")}</span> <br />
                          <span className="text-xs font-normal opacity-70">{format(payout.createdAt, "HH:mm")}</span>
                        </TableCell>
                        <TableCell className="capitalize font-medium text-foreground">
                          {payout.recipientType}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {payout.payoutAddress || "Platform Wallet"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              payout.status === "paid"
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium border-emerald-200 dark:border-emerald-800/50"
                                : payout.status === "in_transit"
                                  ? "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 font-medium border-blue-200 dark:border-blue-800/50"
                                  : payout.status === "failed"
                                    ? "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 font-medium border-red-200 dark:border-red-800/50"
                                    : "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 font-medium border-amber-200 dark:border-amber-800/50"
                            }
                          >
                            {payout.status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <span className="font-bold text-foreground">
                            {/* Payout records its own currency, so we use formatPrice if we want or just Price if we assume global currency, let's use Price */}
                            <Price amount={payout.amountMinorUnits} />
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Sidebar (1/3 width) for Configs/Rules */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 bg-muted/10 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 pt-5 border-b border-border/60 bg-background/50">
              <div className="flex items-center gap-2 mb-1">
                <IconChartPie className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Split Rules</CardTitle>
              </div>
              <CardDescription>
                Active revenue allocation blueprint
              </CardDescription>
            </CardHeader>
            <CardContent className="py-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Global Fallback</h4>
                {splitConfigs.length > 0 ? (
                  splitConfigs[0].recipients.map(
                    (recipient, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3.5 border border-border/80 rounded-xl bg-background shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                          <span className="font-semibold text-foreground capitalize truncate">
                            {recipient.type} Wallet
                          </span>
                          {recipient.payoutAddress && (
                            <span className="text-[11px] font-mono text-muted-foreground truncate opacity-80">
                              Account: {recipient.payoutAddress}
                            </span>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20 text-[13px] px-2.5 py-0.5 shrink-0 tabular-nums"
                        >
                          {recipient.sharePct}%
                        </Badge>
                      </div>
                    )
                  )
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-4 shadow-s dark:shadow-l rounded-xl bg-background">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground capitalize">
                          Owner Fallback
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground opacity-80 uppercase tracking-wide">Primary Routing</span>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-sm px-2.5 py-0.5">
                        100%
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 mt-6 rounded-xl border border-dashed border-primary/30 bg-primary/5 flex items-start gap-4 shadow-inner">
                <IconLock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-sm font-semibold text-foreground">Configuration Locked</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Granular payout rules are locked in the current beta environment. Contact OPUS support to edit native multi-tier commission drops.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function FinancesPage() {
  if (!ACTIVE_CAPABILITIES.payments) redirect("/beauty");
  return <DormantFinancesPage />;
}
