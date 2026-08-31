"use client";

import { FormEvent, useEffect, useState } from "react";
import { useConvexAuth } from "convex/react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";

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
    <section className="w-full">
      <header className="text-center">
        <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-foreground sm:text-4xl">
          {step === "email" ? title : "Check your email"}
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
          {step === "email"
            ? description
            : `Enter the six-digit code sent to ${email}.`}
        </p>
      </header>

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-8">
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="auth-email">Email address</FieldLabel>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
                aria-invalid={Boolean(error)}
                className="h-11 px-3.5"
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Sending code…
                </>
              ) : (
                "Continue with email"
              )}
            </Button>
          </FieldGroup>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-8">
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="auth-code">Sign-in code</FieldLabel>
              <InputOTP
                id="auth-code"
                value={code}
                onChange={setCode}
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                autoComplete="one-time-code"
                autoFocus
                required
                disabled={isSubmitting}
                aria-invalid={Boolean(error)}
                containerClassName="justify-center"
              >
                <InputOTPGroup className="*:data-[slot=input-otp-slot]:size-11 *:data-[slot=input-otp-slot]:text-base">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      aria-invalid={Boolean(error)}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </Field>
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Checking code…
                </>
              ) : (
                "Verify and continue"
              )}
            </Button>
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2.5"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                  setStatus(null);
                }}
              >
                Change email
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0"
                onClick={() => void sendCode()}
                disabled={isSubmitting}
              >
                Send again
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}

      <div aria-live="polite" className="mt-5 min-h-5 text-center text-sm">
        {error ? <p className="text-destructive">{error}</p> : null}
        {!error && status ? (
          <p className="text-muted-foreground">{status}</p>
        ) : null}
      </div>
    </section>
  );
}
