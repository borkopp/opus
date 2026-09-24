import { redirect } from "next/navigation";
import { ACTIVE_CAPABILITIES } from "@/lib/product-scope";
import { AIInboxWorkspace } from "./_components/AIInboxWorkspace";

export default function AIInboxPage() {
  if (!ACTIVE_CAPABILITIES.aiFrontDesk) redirect("/beauty");
  return <AIInboxWorkspace />;
}
