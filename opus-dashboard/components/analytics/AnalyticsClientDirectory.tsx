"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ClientsView,
  DEFAULT_CLIENT_FILTERS,
} from "@/components/clients/ClientsView";
import { ClientProfileSheet } from "@/components/clients/ClientProfileSheet";

export function AnalyticsClientDirectory() {
  const [filters, setFilters] = useState(DEFAULT_CLIENT_FILTERS);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(filters.search), 200);
    return () => clearTimeout(timeout);
  }, [filters.search]);
  const directory = useQuery(api.clients.getDirectory, { ...filters, search });
  const client = useQuery(
    api.clients.getProfile,
    selected ? { customerId: selected as Id<"customers"> } : "skip",
  );
  return (
    <>
      <ClientsView
        embedded
        data={directory}
        filters={filters}
        onFiltersChange={setFilters}
        onSelect={setSelected}
      />
      <ClientProfileSheet
        open={selected !== null}
        profile={client}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
