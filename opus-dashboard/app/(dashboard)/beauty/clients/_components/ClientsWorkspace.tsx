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

export function ClientsWorkspace() {
  const profile = useQuery(api.users.getMyProfile);
  const [filters, setFilters] = useState(DEFAULT_CLIENT_FILTERS);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const paid = profile?.plan === "paid";
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(filters.search), 200);
    return () => clearTimeout(timeout);
  }, [filters.search]);
  const directory = useQuery(
    api.clients.getDirectory,
    paid ? { ...filters, search } : "skip",
  );
  const client = useQuery(
    api.clients.getProfile,
    paid && selected ? { customerId: selected as Id<"customers"> } : "skip",
  );

  return (
    <>
      <ClientsView
        data={paid ? directory : undefined}
        filters={filters}
        onFiltersChange={setFilters}
        onSelect={setSelected}
        locked={profile !== undefined && !paid}
      />
      <ClientProfileSheet
        open={paid && selected !== null}
        profile={client}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
