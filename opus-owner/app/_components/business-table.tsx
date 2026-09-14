"use client";

import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import type { BusinessUsage } from "../../../shared/owner-overview";
import { bytes, date, number } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

export function BusinessTable({ businesses }: { businesses: BusinessUsage[] }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [website, setWebsite] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const filtered = businesses
    .filter(
      (business) =>
        `${business.name} ${business.slug} ${business.city ?? ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()) &&
        (plan === "all" || business.plan === plan) &&
        (website === "all" || business.websiteStatus === website),
    )
    .sort((a, b) =>
      sort === "storage"
        ? b.imageBytes - a.imageBytes
        : sort === "bookings"
          ? b.bookings30d - a.bookings30d
          : b.createdAt - a.createdAt,
    );
  const lastPage = Math.max(0, Math.ceil(filtered.length / 15) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = filtered.slice(currentPage * 15, currentPage * 15 + 15);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk";
  const reset = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Every business, at a glance</CardTitle>
        <CardDescription>
          Website status, plan and current usage. Newest signups first.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search businesses"
              placeholder="Search business or city…"
              value={search}
              onChange={(event) => reset(setSearch, event.target.value)}
              className="pl-9"
            />
          </div>
          <NativeSelect
            aria-label="Filter by plan"
            value={plan}
            onChange={(event) => reset(setPlan, event.target.value)}
          >
            <NativeSelectOption value="all">All plans</NativeSelectOption>
            <NativeSelectOption value="free">Free</NativeSelectOption>
            <NativeSelectOption value="paid">Paid</NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label="Filter by website"
            value={website}
            onChange={(event) => reset(setWebsite, event.target.value)}
          >
            <NativeSelectOption value="all">All websites</NativeSelectOption>
            <NativeSelectOption value="published">Published</NativeSelectOption>
            <NativeSelectOption value="unpublished">
              Unpublished
            </NativeSelectOption>
            <NativeSelectOption value="suspended">Suspended</NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label="Sort businesses"
            value={sort}
            onChange={(event) => reset(setSort, event.target.value)}
          >
            <NativeSelectOption value="newest">Newest first</NativeSelectOption>
            <NativeSelectOption value="storage">
              Most storage
            </NativeSelectOption>
            <NativeSelectOption value="bookings">
              Most bookings · 30d
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Business",
                "Website",
                "Plan",
                "Services",
                "Staff",
                "Customers",
                "Bookings",
                "Images",
                "Image storage",
              ].map((label) => (
                <TableHead key={label}>{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((business) => (
              <TableRow key={business.id}>
                <TableCell className="py-4">
                  <div className="font-medium">{business.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {business.city || "No city yet"} ·{" "}
                    {date(business.createdAt)}
                  </div>
                </TableCell>
                <TableCell>
                  {business.websiteStatus === "published" ? (
                    <Badge asChild>
                      <a
                        href={`https://${business.slug}.${rootDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Published
                        <ExternalLink data-icon="inline-end" />
                      </a>
                    </Badge>
                  ) : (
                    <Badge
                      variant={
                        business.websiteStatus === "suspended"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {business.websiteStatus === "suspended"
                        ? "Suspended"
                        : "Unpublished"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={business.plan === "paid" ? "outline" : "secondary"}
                  >
                    {business.plan === "paid" ? "Paid" : "Free"}
                  </Badge>
                </TableCell>
                <TableCell>{number(business.services)}</TableCell>
                <TableCell>{number(business.staff)}</TableCell>
                <TableCell>{number(business.customers)}</TableCell>
                <TableCell>
                  <div>{number(business.bookings)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {number(business.bookings30d)} in 30d
                  </div>
                </TableCell>
                <TableCell>
                  <div>{number(business.images)}</div>
                  {business.externalImages > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      + {number(business.externalImages)} external
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="tabular-nums">
                    {bytes(business.imageBytes)}
                  </div>
                  {business.missingImages > 0 && (
                    <div className="mt-1 text-xs text-destructive">
                      {number(business.missingImages)} missing
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!visible.length && (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <p className="font-medium">
                    {businesses.length
                      ? "No businesses match these filters."
                      : "Your first business will appear here."}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {businesses.length
                      ? "Try another name or clear the filters."
                      : "New beauty business signups are included when you refresh."}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            {number(filtered.length)} of {number(businesses.length)} businesses
            · services and staff count active records.
          </p>
          {lastPage > 0 && (
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span>
                {currentPage + 1} / {lastPage + 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === lastPage}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
