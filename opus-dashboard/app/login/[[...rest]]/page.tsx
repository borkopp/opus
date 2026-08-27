import { AuthLayout } from "@/components/login";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  return (
    <AuthLayout>
      <EmailOtpForm
        title="Welcome back"
        description="Use your studio email. We will send a one-time code—no password to remember."
        callbackUrl={callbackUrl}
      />
    </AuthLayout>
  );
}
