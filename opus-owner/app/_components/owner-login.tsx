"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brand } from "./brand";

export function OwnerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(sendCode: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        sendCode
          ? "/api/auth/email-otp/send-verification-otp"
          : "/api/auth/sign-in/email-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            sendCode
              ? { email: email.trim().toLowerCase(), type: "sign-in" }
              : { email: email.trim().toLowerCase(), otp },
          ),
        },
      );
      if (!response.ok) {
        if (response.status === 429)
          throw new Error(
            "Too many attempts. Please wait a minute and try again.",
          );
        if (sendCode && response.status === 403)
          throw new Error("This email cannot access the owner dashboard.");
        throw new Error(
          sendCode
            ? "The code could not be sent. Please try again."
            : "That code is invalid or expired. Try again or request a new one.",
        );
      }
      if (sendCode) {
        setSent(true);
        setCooldown(60);
        setOtp("");
      } else router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <Brand />
      <Card>
        <CardHeader>
          <LockKeyhole
            className="mb-4 size-6 text-primary"
            aria-hidden="true"
          />
          <CardTitle>Just for you.</CardTitle>
          <CardDescription>
            {sent
              ? `Enter the six-digit code sent to ${email}. It expires in five minutes.`
              : "Your private view of OPUS. Sign in with your owner email to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit(!sent);
            }}
          >
            <FieldGroup>
              {!sent ? (
                <Field>
                  <FieldLabel htmlFor="email">Owner email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={busy}
                    autoFocus
                  />
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="code">One-time code</FieldLabel>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, ""))
                    }
                    required
                    disabled={busy}
                    autoFocus
                  />
                </Field>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                disabled={busy || (sent && otp.length !== 6)}
              >
                {busy
                  ? "One moment…"
                  : sent
                    ? "Open overview"
                    : "Email me a code"}
                <ArrowRight data-icon="inline-end" />
              </Button>
              {sent && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={busy || cooldown > 0}
                    onClick={() => void submit(true)}
                  >
                    {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setSent(false);
                      setError("");
                    }}
                  >
                    Change email
                  </Button>
                </div>
              )}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Mail className="size-4" aria-hidden="true" />
        Access is limited to the OPUS owner.
      </p>
    </main>
  );
}
