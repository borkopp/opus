import { getRequestLocale } from "@/lib/i18n/server";
import type { Viewport } from "next";
import { StudioInstallProvider } from "@/components/pwa/StudioInstallProvider";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import {
  studioAppMetadata,
  studioAppViewport,
} from "@/lib/studio-app-metadata";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery, getInitialAuthToken } from "@/lib/auth-server";
import { authDestination } from "@/lib/auth-destination";
import { isActiveIndustry } from "@/lib/product-scope";
import {
  clientSignInDestination,
  clientSignInPath,
} from "@/lib/client-account";

export const metadata = studioAppMetadata;
export const viewport: Viewport = { ...studioAppViewport, viewportFit: "auto" };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const locale = await getRequestLocale();
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  // Older booking links must enter client authentication before studio sync runs.
  if (callbackUrl && clientSignInDestination(callbackUrl) === callbackUrl) {
    redirect(clientSignInPath(callbackUrl));
  }

  // Returning users arriving from opus.mk should never render the login form.
  // Keep onboarding, personal staff and explicit return destinations intact.
  let destination: string | undefined;
  if (await getInitialAuthToken()) {
    try {
      const profile = await fetchAuthQuery(api.users.getMyProfile, {});
      if (profile) {
        const needsActivation =
          profile.orgId &&
          isActiveIndustry(profile.industry) &&
          profile.bookingAccess !== "own";
        const activation = needsActivation
          ? await fetchAuthQuery(api.activation.getState, {})
          : undefined;
        destination = authDestination(
          callbackUrl,
          Boolean(profile.orgId && !needsActivation) ||
            (activation?.onboardingComplete ?? false),
        );
      }
    } catch {
      // A temporary backend failure must not log out a remembered session.
      // The client below handles recovery and retries on this same route.
    }
  }
  if (destination) redirect(destination);

  return (
    <StudioInstallProvider>
      <AuthLayout>
        <EmailOtpForm
          replayPublicTitle
          replayPublicDescription
          title={
            locale === "sq"
              ? "Mirësevini në studion tuaj"
              : locale === "mk"
                ? "Добредојдовте во вашето студио"
                : "Welcome to your studio"
          }
          description={
            locale === "sq"
              ? "Kyçuni ose krijoni llogari për të menaxhuar studion tuaj të bukurisë."
              : locale === "mk"
                ? "Најавете се или создајте сметка за да управувате со вашето студио."
                : "Log in or create an account to manage your beauty studio."
          }
          callbackUrl={callbackUrl}
        />
      </AuthLayout>
    </StudioInstallProvider>
  );
}
