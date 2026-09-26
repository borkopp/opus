"use client";

import { FormEvent, useEffect, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Mail, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { authDestination } from "@/lib/auth-destination";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Spinner } from "@/components/ui/spinner";
import s from "./auth.module.css";

type EmailOtpFormProps = {
  title: string;
  description: string;
  callbackUrl?: string;
  replayPublicTitle?: boolean;
  replayPublicDescription?: boolean;
};

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : direction < 0 ? -20 : 0,
    opacity: 0,
    filter: "blur(4px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -20 : direction < 0 ? 20 : 0,
    opacity: 0,
    filter: "blur(4px)",
  }),
};

const stepTransition = {
  duration: 0.22,
  ease: [0.23, 1, 0.32, 1] as const,
};

function accountName(email: string) {
  const [localPart = ""] = email.split("@");
  const readable = localPart.replace(/[._-]+/g, " ").trim();
  return readable || "OPUS user";
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
  replayPublicTitle = false,
  replayPublicDescription = false,
}: EmailOtpFormProps) {
  const { t } = useDashboardI18n();
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const profile = useQuery(
    api.users.getMyProfile,
    isAuthenticated ? {} : "skip",
  );
  const activation = useQuery(
    api.activation.getState,
    profile?.orgId ? {} : "skip",
  );
  const destination = authDestination(
    callbackUrl,
    activation?.onboardingComplete ?? false,
  );
  const readyToRedirect =
    isAuthenticated &&
    Boolean(profile) &&
    (!profile?.orgId || Boolean(activation));
  const [step, setStep] = useState<"email" | "code">("email");
  const [direction, setDirection] = useState(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (readyToRedirect) {
      router.replace(destination);
    }
  }, [destination, readyToRedirect, router]);

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
          t(
            result.error.message || "We could not send a code. Try again.",
            "Кодот не се испрати. Проверете ја е-поштата и обидете се повторно.",
          ),
        );
        return;
      }

      setEmail(normalizedEmail);
      setCode("");
      setDirection(1);
      setStep("code");
      setStatus(t("A fresh code was sent.", "Испратен е нов код."));
    } catch (caught) {
      setError(
        t(
          networkErrorMessage(caught),
          "Врската не успеа. Обидете се повторно.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError(t("Enter the six-digit code.", "Внесете го шестцифрениот код."));
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
          t(
            result.error.message ||
              "That code is not valid. Request a new one.",
            "Кодот не е валиден или е истечен. Побарајте нов код.",
          ),
        );
        return;
      }

      if (!result.data?.user) {
        setError(
          t(
            "Sign-in could not be confirmed. Try again.",
            "Најавата не успеа. Обидете се повторно.",
          ),
        );
        return;
      }

      setStatus(
        t(
          "Signed in. Opening your studio…",
          "Успешна најава. Го отвораме вашето студио…",
        ),
      );
    } catch (caught) {
      setError(
        t(
          networkErrorMessage(caught),
          "Врската не успеа. Обидете се повторно.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return (
      <section
        className="flex min-h-40 items-center justify-center gap-3"
        aria-busy="true"
        aria-live="polite"
      >
        <Spinner />
        <p data-replay-public className="text-sm text-muted-foreground">
          {t("Opening your studio…", "Го отвораме вашето студио…")}
        </p>
      </section>
    );
  }

  return (
    <section className={s.form} aria-busy={isSubmitting}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={step}
          custom={direction}
          variants={reduceMotion ? undefined : stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={stepTransition}
          className="w-full"
        >
          <header>
            <div className={s.stepIcon} aria-hidden="true">
              {step === "email" ? <Mail size={23} /> : <MailCheck size={23} />}
            </div>
            <h1
              data-replay-public={
                step !== "email" || replayPublicTitle || undefined
              }
            >
              {step === "email"
                ? title
                : t("Check your email", "Проверете ја вашата е-пошта")}
            </h1>
            <p
              data-replay-public={
                (step === "email" && replayPublicDescription) || undefined
              }
              className={s.description}
            >
              {step === "email"
                ? description
                : t(
                    `Enter the six-digit code sent to ${email}.`,
                    `Внесете го шестцифрениот код испратен на ${email}.`,
                  )}
            </p>
          </header>

          {step === "email" ? (
            <form onSubmit={sendCode} className="mt-8">
              <FieldGroup className="gap-5">
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel data-replay-public htmlFor="auth-email">
                    {t("Email address", "Е-пошта")}
                  </FieldLabel>
                  <Input
                    id="auth-email"
                    type="email"
                    variant="surface"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@studio.mk"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    autoFocus
                    aria-invalid={Boolean(error)}
                    aria-describedby="auth-email-hint"
                    className="h-12"
                  />
                  <FieldDescription data-replay-public id="auth-email-hint">
                    {t(
                      "We’ll email you a six-digit code. No password needed.",
                      "Ќе ви испратиме шестцифрен код по е-пошта. Не ви треба лозинка.",
                    )}
                  </FieldDescription>
                </Field>
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      {t("Sending code…", "Испраќање код…")}
                    </>
                  ) : (
                    <>
                      {t("Continue with email", "Продолжи со е-пошта")}
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </FieldGroup>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="mt-8">
              <FieldGroup className="gap-5">
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel data-replay-public htmlFor="auth-code">
                    {t("Sign-in code", "Код за најава")}
                  </FieldLabel>
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
                    containerClassName="w-full"
                  >
                    <InputOTPGroup className="w-full">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          aria-invalid={Boolean(error)}
                          className="h-12 flex-1 text-base"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </Field>
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      {t("Checking code…", "Проверка на кодот…")}
                    </>
                  ) : (
                    <>
                      {t("Verify and continue", "Потврди и продолжи")}
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    data-replay-public
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                      setDirection(-1);
                      setStep("email");
                      setCode("");
                      setError(null);
                      setStatus(null);
                    }}
                  >
                    {t("Change email", "Промени е-пошта")}
                  </Button>
                  <Button
                    data-replay-public
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => void sendCode()}
                    disabled={isSubmitting}
                  >
                    {t("Send again", "Испрати повторно")}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

      <div aria-live="polite" className="mt-5 min-h-5 text-sm">
        {error ? <p className="text-destructive">{error}</p> : null}
        {!error && status ? (
          <p className="text-muted-foreground">{status}</p>
        ) : null}
      </div>
    </section>
  );
}
