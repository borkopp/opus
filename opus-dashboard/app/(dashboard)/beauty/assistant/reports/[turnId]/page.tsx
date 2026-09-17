import { SavedReport } from "./_components/SavedReport";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ turnId: string }>;
}) {
  const { turnId } = await params;
  return <SavedReport turnId={turnId} />;
}
