import { fetchAuthQuery } from "@/lib/auth-server";
import { ownerAccess } from "@/lib/api";
import { OwnerDashboard } from "./_components/owner-dashboard";
import { OwnerLogin } from "./_components/owner-login";

export const dynamic = "force-dynamic";

export default async function Page() {
  let email: string;
  try {
    email = (await fetchAuthQuery(ownerAccess, {})).email;
  } catch {
    return <OwnerLogin />;
  }
  return <OwnerDashboard email={email} />;
}
