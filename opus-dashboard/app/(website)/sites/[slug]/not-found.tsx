import Link from "next/link";
import { ArrowLeft, Globe2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function PublicSiteNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <Link
        href="https://opus.mk"
        aria-label="OPUS"
        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Logo className="text-2xl" />
      </Link>
      <Empty className="max-w-xl border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Globe2 />
          </EmptyMedia>
          <EmptyTitle>Веб-страницата не е достапна</EmptyTitle>
          <EmptyDescription>
            Адресата можеби е променета или студиото моментално не прима онлајн
            резервации.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="https://opus.mk">
              <ArrowLeft data-icon="inline-start" />
              Оди на opus.mk
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
