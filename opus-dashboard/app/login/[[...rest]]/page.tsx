import { getRequestLocale } from "@/lib/i18n/server";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { studioAppMetadata } from "@/lib/studio-app-metadata";
import { redirect } from "next/navigation";
import {
  clientSignInDestination,
  clientSignInPath,
} from "@/lib/client-account";

export const metadata = studioAppMetadata;

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

  return (
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
  );
}
