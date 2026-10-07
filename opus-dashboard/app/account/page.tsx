import { Suspense } from "react";
import type { Metadata } from "next";
import { ClientAccountWorkspace } from "@/components/client-account/ClientAccountWorkspace";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "My appointments",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AccountPage() {
  return (
    <Suspense
      fallback={<Skeleton className="mx-auto mt-12 h-64 w-full max-w-3xl" />}
    >
      <ClientAccountWorkspace />
    </Suspense>
  );
}
