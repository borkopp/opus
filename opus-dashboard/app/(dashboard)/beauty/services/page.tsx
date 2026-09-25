import { Suspense } from "react";
import { ServicesWorkspace } from "./_components/ServicesWorkspace";
import { WorkspaceSkeleton } from "./_components/WorkspaceSkeleton";

export default function ServicesPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <ServicesWorkspace />
    </Suspense>
  );
}
