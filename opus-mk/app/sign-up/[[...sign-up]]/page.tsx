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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <EmailOtpForm
        title="Create your OPUS access"
        description="Use your email to receive a secure one-time code. No password is required."
        callbackUrl={callbackUrl}
      />
    </main>
  );
}
