import { EmailOtpForm } from "@/components/auth/EmailOtpForm";

export default async function SignInPage({
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
        title="Welcome back"
        description="Enter your email and we will send a one-time code for your OPUS bookings."
        callbackUrl={callbackUrl}
      />
    </main>
  );
}
