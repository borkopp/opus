import Link from "next/link";
import { ArrowLeft, CalendarClock, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function HospitalityComingSoon() {
  return (
    <Empty className="min-h-[65vh] border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UtensilsCrossed />
        </EmptyMedia>
        <EmptyTitle>Hospitality is being rebuilt for launch</EmptyTitle>
        <EmptyDescription>
          Reservations, floor plans, and marketplace activation are hidden until
          the full path is reliable from first setup to guest arrival.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock />
          No mock controls or placeholder reservations are exposed.
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            Back to OPUS
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
