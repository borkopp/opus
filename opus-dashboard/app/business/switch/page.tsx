import { BusinessSwitch } from "@/components/staff/BusinessSwitch";

export default async function BusinessSwitchPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org } = await searchParams;
  return <BusinessSwitch orgId={org} />;
}
