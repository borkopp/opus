import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default async function SignUpPage({
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
        title="Keep your bookings close"
        description="Use your email to create your booking access. No password is required."
        callbackUrl={callbackUrl}
      />
    </AuthLayout>
  );
}
