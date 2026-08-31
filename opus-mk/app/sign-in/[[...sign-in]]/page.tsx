import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export default async function SignInPage({
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
        title="Your bookings are here"
        description="Enter the email used for your bookings. We’ll send a six-digit code."
        callbackUrl={callbackUrl}
      />
    </AuthLayout>
  );
}
