"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { accountErrorMessage } from "@/lib/account-errors";
import { usePushSignOut } from "@/hooks/use-push-sign-out";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Logo } from "@/components/Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export function StaffInviteAcceptance({ token }: { token: string }) {
  const signOut = usePushSignOut();
  const { t } = useDashboardI18n();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const invite = useQuery(api.staff.getInvite, { token });
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const accept = useMutation(api.staff.acceptStaffInvite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-4 py-10">
      <Logo />
      <Card>
        <CardHeader>
          <CardTitle>
            {t(
              "Join your studio",
              "Приклучете се на студиото",
              "Bashkohuni me studion tuaj",
            )}
          </CardTitle>
          <CardDescription>
            {invite
              ? `${invite.staffName} · ${invite.studioName}`
              : t(
                  "Personal team account",
                  "Лична сметка за тимот",
                  "Llogari personale e ekipit",
                )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {invite === undefined ? (
            <Skeleton className="h-20 w-full" />
          ) : !invite ? (
            <p>
              {t(
                "This invitation has expired or is no longer available. Ask the owner for a new invitation.",
                "Поканата е истечена или недостапна. Побарајте нова покана од сопственикот.",
                "Kjo ftesë ka skaduar ose nuk është më e disponueshme. Kërkoni një ftesë të re nga pronari.",
              )}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Sign in with the email that received this invitation. Your existing OPUS account can be used.",
                  "Најавете се со е-поштата што ја доби поканата. Може да ја користите постојната OPUS сметка.",
                  "Hyni me emailin që mori ftesën. Mund të përdorni llogarinë tuaj ekzistuese OPUS.",
                )}
              </p>
              {!isAuthenticated ? (
                <Button asChild>
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(`/invites/${token}`)}`}
                  >
                    {t(
                      "Sign in to accept",
                      "Најави се за прифаќање",
                      "Hyni për të pranuar",
                    )}
                  </Link>
                </Button>
              ) : invite.emailMatches ? (
                <Button
                  disabled={busy || !profile}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await accept({ token });
                      router.replace("/beauty/bookings");
                    } catch (caught) {
                      setError(
                        accountErrorMessage(
                          caught,
                          t(
                            "Could not accept invitation",
                            "Поканата не се прифати",
                            "Ftesa nuk u pranua",
                          ),
                        ),
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy && <Spinner data-icon="inline-start" />}
                  {t("Accept invitation", "Прифати покана", "Prano ftesën")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const result = await signOut();
                      if (result.error)
                        setError(result.error.message ?? "Could not sign out.");
                    } catch {
                      setError(
                        t(
                          "Could not sign out. Try again.",
                          "Одјавувањето не успеа. Обиди се повторно.",
                          "Dalja dështoi. Provoni përsëri.",
                        ),
                      );
                    }
                  }}
                >
                  {t(
                    "Use the invited email",
                    "Користи ја поканетата е-пошта",
                    "Përdor emailin e ftuar",
                  )}
                </Button>
              )}
            </>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>
                {t(
                  "Invitation unavailable",
                  "Поканата е недостапна",
                  "Ftesa nuk është e disponueshme",
                )}
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
