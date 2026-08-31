import Link from "next/link";
import { ArrowLeft, Globe2 } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
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
