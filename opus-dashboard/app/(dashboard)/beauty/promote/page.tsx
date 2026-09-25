import { Suspense } from "react";
import { PromotionsWorkspace } from "./_components/PromotionsWorkspace";

export default function PromotePage() {
  return (
    <Suspense>
      <PromotionsWorkspace />
    </Suspense>
  );
}
