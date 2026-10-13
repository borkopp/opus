import { getRequestLocale } from "@/lib/i18n/server";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { redirect } from "next/navigation";
import {
  clientSignInDestination,
  clientSignInPath,
} from "@/lib/client-account";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const locale = await getRequestLocale();
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

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
            ? "Krijoni llogarinë tuaj të biznesit"
            : locale === "mk"
              ? "Создајте деловна сметка"
              : "Create your business account"
        }
        description={
          locale === "sq"
            ? "Filloni me emailin tuaj të biznesit. Do t'ju dërgojmë një kod të sigurt për të vazhduar."
            : locale === "mk"
              ? "Внесете ја вашата деловна е-пошта. Ќе ви испратиме код за да продолжите."
              : "Start with your business email. We’ll send one secure code to continue."
        }
        callbackUrl={callbackUrl}
      />
    </AuthLayout>
  );
}
