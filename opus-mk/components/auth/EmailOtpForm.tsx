"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EmailOtpFormProps = {
  title: string;
  description: string;
  callbackUrl?: string;
};

function safeCallbackUrl(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function accountName(email: string) {
  const [localPart = ""] = email.split("@");
  return localPart.replace(/[._-]+/g, " ").trim() || "OPUS user";
}

function networkErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The connection failed. Try again.";
}

export function EmailOtpForm({
  title,
  description,
  callbackUrl,
}: EmailOtpFormProps) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const destination = safeCallbackUrl(callbackUrl);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(destination);
    }
  }, [destination, isAuthenticated, router]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setError(null);
    setStatus(null);
    setIsSubmitting(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: normalizedEmail,
        type: "sign-in",
      });
      if (result.error) {
        setError(
          result.error.message || "We could not send a code. Try again.",
        );
        return;
      }
      setEmail(normalizedEmail);
      setCode("");
      setStep("code");
      setStatus("A fresh code was sent.");
      requestAnimationFrame(() => codeInputRef.current?.focus());
    } catch (caught) {
      setError(networkErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError("Enter the six-digit code.");
      return;
    }

    setError(null);
    setStatus(null);
    setIsSubmitting(true);
    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp: code,
        name: accountName(email),
      });
      if (result.error) {
        setError(
          result.error.message || "That code is not valid. Request a new one.",
        );
        return;
      }
      if (!result.data?.user) {
        setError("Sign-in could not be confirmed. Try again.");
        return;
      }

      setStatus("Signed in. Opening your bookings…");
    } catch (caught) {
      setError(networkErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-md rounded-[26px] border border-border/50 bg-card p-7 shadow-[0_28px_90px_-58px_rgba(26,24,21,0.75)] sm:p-9">
      <div className="mb-9 flex items-start justify-between gap-5">
        <div>
          <p className="font-display text-xl font-semibold tracking-[-0.04em]">
            OPUS
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Your appointments
          </p>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <span className={step === "email" ? "text-foreground" : undefined}>
            01
          </span>
          <span className="h-px w-5 bg-border" />
          <span className={step === "code" ? "text-foreground" : undefined}>
            02
          </span>
        </div>
      </div>

      <h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-foreground">
        {step === "email" ? title : "Your code is on its way"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {step === "email"
          ? description
          : `Enter the six digits sent to ${email}.`}
      </p>

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-7 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="auth-email"
              className="text-xs font-semibold text-foreground"
            >
              Email address
            </label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              autoFocus
              className="h-11 rounded-xl px-3.5"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-xl bg-cta text-cta-foreground hover:bg-cta/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending code…" : "Continue with email"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-7 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="auth-code"
              className="text-xs font-semibold text-foreground"
            >
              Sign-in code
            </label>
            <Input
              ref={codeInputRef}
              id="auth-code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              required
              aria-invalid={Boolean(error)}
              className="h-14 rounded-xl px-4 font-mono text-xl tracking-[0.42em]"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-xl bg-cta text-cta-foreground hover:bg-cta/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Checking code…" : "Verify and continue"}
          </Button>
          <div className="flex items-center justify-between gap-4 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setStatus(null);
              }}
              className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={isSubmitting}
              className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              Send again
            </button>
          </div>
        </form>
      )}

      <div aria-live="polite" className="mt-5 min-h-5 text-sm">
        {error ? <p className="text-destructive">{error}</p> : null}
        {!error && status ? (
          <p className="text-muted-foreground">{status}</p>
        ) : null}
      </div>
    </section>
  );
}
