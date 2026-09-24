import { StaffMemberWorkspace } from "./_components/StaffMemberWorkspace";

export default function StaffMemberPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  return <StaffMemberWorkspace params={params} />;
}
