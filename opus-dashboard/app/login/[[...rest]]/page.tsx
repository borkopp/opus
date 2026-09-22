import { getRequestLocale } from "@/lib/i18n/server";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const locale = await getRequestLocale();
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  return (
    <AuthLayout>
      <EmailOtpForm
        title={
          locale === "mk"
            ? "Добредојдовте во вашето студио"
            : "Welcome to your studio"
        }
        description={
          locale === "mk"
            ? "Најавете се или создајте сметка за да управувате со вашето студио."
            : "Log in or create an account to manage your beauty studio."
        }
        callbackUrl={callbackUrl}
      />
    </AuthLayout>
  );
}
