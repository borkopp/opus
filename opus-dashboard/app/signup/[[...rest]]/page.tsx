import { AuthLayout } from "@/components/login";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";

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
        title="Start with your email"
        description="Enter your studio email to create or open your OPUS workspace with a one-time code."
        callbackUrl={callbackUrl}
      />
    </AuthLayout>
  );
}
