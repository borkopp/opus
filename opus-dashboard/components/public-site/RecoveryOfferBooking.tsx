"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingForm } from "./BookingForm";
import type { PublicSite } from "./types";

export function RecoveryOfferBooking({
  site,
  token,
}: {
  site: PublicSite;
  token: string;
}) {
  const offer = useQuery(api.ai.gapOptimizerHelpers.getPublicOffer, {
    orgId: site._id,
    token,
  });
  const decline = useMutation(api.ai.gapOptimizerHelpers.declinePublicOffer);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function respond(unsubscribe: boolean) {
    setBusy(true);
    try {
      await decline({ orgId: site._id, token, unsubscribe });
      setMessage(
        unsubscribe
          ? "Повеќе нема да добивате понуди за слободни термини од ова студио."
          : "Понудата е одбиена.",
      );
    } catch {
      setMessage("Промената не е зачувана. Обидете се повторно.");
    } finally {
      setBusy(false);
    }
  }
  if (offer === undefined)
    return <Skeleton className="mx-auto my-10 h-80 w-full max-w-xl" />;
  return (
    <>
      {offer ? (
        <BookingForm
          site={site}
          initialServiceId={offer.serviceId}
          initialStaffId={offer.staffId}
          recoveryOffer={{ ...offer, token }}
        />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-12">
          <Alert>
            <AlertTitle>Понудата повеќе не е достапна</AlertTitle>
            <AlertDescription>
              Изберете друг слободен термин од распоредот на студиото.
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/book">Прегледај други термини</Link>
          </Button>
        </div>
      )}
      {offer && (
        <div className="mx-auto flex max-w-xl flex-col gap-3 px-5 py-8">
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy || !offer.available}
              onClick={() => respond(false)}
            >
              Одбиј ја понудата
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => respond(true)}
            >
              Исклучи ги овие пораки
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
