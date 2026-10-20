import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssistantGallery } from "./_components/assistant-gallery";

export const metadata: Metadata = {
  title: "Assistant response gallery",
  robots: { index: false, follow: false },
};

export default function AssistantGalleryPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AssistantGallery />;
}
