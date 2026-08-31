import { AuthLayout } from "@/components/auth/AuthLayout";
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
        description="Enter your studio email. We’ll send a six-digit code—no password needed."
        callbackUrl={callbackUrl}
      />
    </AuthLayout>
  );
}
