"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { AccountLinkError, accountErrorMessage } from "@/lib/account-errors";
import type { Id } from "@/convex/_generated/dataModel";
import { usePushSignOut } from "@/hooks/use-push-sign-out";
import { authClient } from "@/lib/auth-client";
import { useClientAccount } from "@/hooks/use-client-account";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientProfileForm } from "./ClientProfileForm";
import { ClientAppointments } from "./ClientAppointments";

export function ClientAccountWorkspace() {
  const signOutAccount = usePushSignOut();
  const { t } = useDashboardI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { user, isAuthenticated, isLoading, error } = useClientAccount();
  const appointments = useQuery(
    api.opusUsers.getMyBookings,
    user ? {} : "skip",
  );
  const claim = useMutation(api.opusUsers.claimBooking);
  const claimId = params.get("claim");
  const signInPath = `/account/sign-in${claimId ? `?callbackUrl=${encodeURIComponent(`/account?claim=${encodeURIComponent(claimId)}`)}` : ""}`;
  const signOut = async () => {
    try {
      const result = await signOutAccount();
      if (result.error) toast.error(result.error.message);
      else router.replace(signInPath);
    } catch {
      toast.error(
        t(
          "Could not sign out. Try again.",
          "Одјавувањето не успеа. Обиди се повторно.",
          "Dalja dështoi. Provoni përsëri.",
        ),
      );
    }
  };
  const attemptedClaim = useRef<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  useEffect(() => {
    if (claimId) {
      const proof = new URLSearchParams(window.location.hash.slice(1)).get(
        "proof",
      );
      if (proof) {
        try {
          sessionStorage.setItem(`opus-appointment-claim:${claimId}`, proof);
        } catch {
          /* The claim effect reports unavailable storage. */
        }
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
    }
    if (!isLoading && !isAuthenticated)
      router.replace(
        `/account/sign-in?callbackUrl=${encodeURIComponent(claimId ? `/account?claim=${encodeURIComponent(claimId)}` : "/account")}`,
      );
  }, [claimId, isAuthenticated, isLoading, router]);
  useEffect(() => {
    if (
      !user ||
      !claimId ||
      attemptedClaim.current === `${user._id}:${claimId}`
    )
      return;
    attemptedClaim.current = `${user._id}:${claimId}`;
    void (async () => {
      const token = sessionStorage.getItem(`opus-appointment-claim:${claimId}`);
      if (!token)
        throw new AccountLinkError(
          t(
            "Open the complete appointment link from your confirmation email.",
            "Отворете го целосниот линк од е-поштата за потврда.",
            "Hapni lidhjen e plotë nga emaili i konfirmimit.",
          ),
        );
      await claim({ bookingId: claimId as Id<"bookings">, token });
      sessionStorage.removeItem(`opus-appointment-claim:${claimId}`);
    })()
      .then(() => {
        router.replace("/account");
        toast.success(
          t(
            "Appointment saved to your account",
            "Терминот е зачуван во вашата сметка",
            "Termini u ruajt në llogarinë tuaj",
          ),
        );
      })
      .catch((caught: unknown) =>
        setClaimError(
          accountErrorMessage(
            caught,
            t(
              "This link could not be verified.",
              "Линкот не може да се потврди.",
              "Kjo lidhje nuk mund të verifikohej.",
            ),
          ),
        ),
      );
  }, [claim, claimId, router, t, user]);
  if (error)
    return (
      <div className="mx-auto max-w-xl p-6">
        <Alert variant="destructive">
          <AlertTitle>
            {t(
              "Account unavailable",
              "Сметката е недостапна",
              "Llogaria nuk është e disponueshme",
            )}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void signOut()}
        >
          {t(
            "Use another email",
            "Користи друга е-пошта",
            "Përdor një email tjetër",
          )}
        </Button>
      </div>
    );
  if (isLoading || !user || appointments === undefined)
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-5 p-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <Button variant="outline" onClick={() => void signOut()}>
          {t("Sign out", "Одјави се", "Dil")}
        </Button>
      </header>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">
          {t("My appointments", "Мои термини", "Terminet e mia")}
        </h1>
        <p className="break-all text-sm text-muted-foreground">{user.email}</p>
        <p className="text-sm text-muted-foreground">
          {t(
            "One OPUS account across studios. Each studio sees only its own client records.",
            "Една OPUS сметка за сите студија. Секое студио ги гледа само своите записи за клиентите.",
            "Një llogari OPUS në të gjitha studiot. Çdo studio sheh vetëm regjistrat e vet të klientëve.",
          )}
        </p>
      </div>
      {claimError && (
        <Alert variant="destructive">
          <AlertTitle>
            {t("Appointment link", "Линк за термин", "Lidhja e terminit")}
          </AlertTitle>
          <AlertDescription>{claimError}</AlertDescription>
        </Alert>
      )}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)]">
        <ClientAppointments appointments={appointments} />
        <Card>
          <CardHeader>
            <CardTitle>
              {t("Your details", "Ваши детали", "Detajet tuaja")}
            </CardTitle>
            <CardDescription>
              {t(
                "Ready for your next booking",
                "Подготвени за следното закажување",
                "Gati për rezervimin tuaj të ardhshëm",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ClientProfileForm key={user._id} user={user} />
            <Button
              variant="outline"
              onClick={async () => {
                const result = await authClient.revokeOtherSessions();
                if (result.error) toast.error(result.error.message);
                else
                  toast.success(
                    t(
                      "Other devices signed out",
                      "Другите уреди се одјавени",
                      "Pajisjet e tjera dolën",
                    ),
                  );
              }}
            >
              {t(
                "Sign out other devices",
                "Одјави други уреди",
                "Dil nga pajisjet e tjera",
              )}
            </Button>
            <Button asChild variant="link">
              <Link href="/login">
                {t(
                  "Studio staff sign-in",
                  "Најава за тимот на студиото",
                  "Hyrja e stafit të studios",
                )}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
