import { notFound } from "next/navigation";
import { StudioInstallProvider } from "@/components/pwa/StudioInstallProvider";
import { StudioInstallCard } from "@/components/pwa/StudioInstallCard";
import {
  studioAppMetadata,
  studioAppViewport,
} from "@/lib/studio-app-metadata";

export const metadata = {
  ...studioAppMetadata,
  robots: { index: false, follow: false },
};
export const viewport = studioAppViewport;

/** Local-only harness for real install components; no session or studio data. */
export default function InstallPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <StudioInstallProvider>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <StudioInstallCard banner />
        <StudioInstallCard />
      </main>
    </StudioInstallProvider>
  );
}
