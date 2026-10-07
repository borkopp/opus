"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Mail, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { clientSignInDestination } from "@/lib/client-account";
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
import { useAuthSecurity } from "@/hooks/use-auth-security";
import { AuthCaptcha } from "./AuthCaptcha";
import s from "./auth.module.css";

type EmailOtpFormProps = {
  purpose?: "studio" | "client";
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
  purpose = "studio",
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
    isAuthenticated && purpose === "studio" ? {} : "skip",
  );
  const activation = useQuery(
    api.activation.getState,
    profile?.orgId && profile.bookingAccess !== "own" ? {} : "skip",
  );
  const destination =
    purpose === "client"
      ? clientSignInDestination(callbackUrl)
      : authDestination(
          callbackUrl,
          profile?.bookingAccess === "own" ||
            (activation?.onboardingComplete ?? false),
        );
  const readyToRedirect =
    isAuthenticated &&
    (purpose === "client" ||
      (Boolean(profile) &&
        (!profile?.orgId ||
          profile.bookingAccess === "own" ||
          Boolean(activation))));
  const [step, setStep] = useState<"email" | "code">("email");
  const [direction, setDirection] = useState(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const security = useAuthSecurity();
  const {
    policy: captchaPolicy,
    unavailable: captchaUnavailable,
    token: captchaToken,
    setToken: setCaptchaToken,
    generation: captchaGeneration,
  } = security;
  const [showResendCaptcha, setShowResendCaptcha] = useState(false);
  const captchaError = useCallback(() => {
    setCaptchaToken(null);
    setError(
      t(
        "The security check could not load. Refresh the page and try again.",
        "Безбедносната проверка не се вчита. Освежете ја страницата и обидете се повторно.",
        "Kontrolli i sigurisë nuk mund të ngarkohej. Rifreskoni faqen dhe provoni përsëri.",
      ),
    );
  }, [t, setCaptchaToken]);

  useEffect(() => {
    if (readyToRedirect) {
      router.replace(destination);
    }
  }, [destination, readyToRedirect, router]);

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    if (!captchaPolicy || captchaUnavailable) return;
    if (captchaPolicy.required && !captchaToken) {
      setShowResendCaptcha(true);
      setError(
        t(
          "Complete the security check to send another code.",
          "Завршете ја безбедносната проверка за да испратите нов код.",
          "Përfundoni kontrollin e sigurisë për të dërguar një kod tjetër.",
        ),
      );
      return;
    }

    setError(null);
    setStatus(null);
    setIsSubmitting(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp(
        {
          email: normalizedEmail,
          type: "sign-in",
        },
        {
          headers: captchaToken
            ? { "x-captcha-response": captchaToken }
            : undefined,
        },
      );

      if (result.error) {
        setError(
          t(
            result.error.message || "We could not send a code. Try again.",
            "Кодот не се испрати. Проверете ја е-поштата и обидете се повторно.",
            "Kodi nuk u dërgua. Kontrolloni emailin tuaj dhe provoni përsëri.",
          ),
        );
        return;
      }

      setEmail(normalizedEmail);
      setCode("");
      setDirection(1);
      setStep("code");
      setShowResendCaptcha(false);
      setStatus(
        t(
          "A fresh code was sent.",
          "Испратен е нов код.",
          "Një kod i ri u dërgua.",
        ),
      );
    } catch (caught) {
      setError(
        t(
          networkErrorMessage(caught),
          "Врската не успеа. Обидете се повторно.",
          "Lidhja dështoi. Provoni përsëri.",
        ),
      );
    } finally {
      // Turnstile tokens are single-use, including a failed send attempt.
      security.reset();
      setIsSubmitting(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError(
        t(
          "Enter the six-digit code.",
          "Внесете го шестцифрениот код.",
          "Shënoni kodin gjashtëshifror.",
        ),
      );
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
            "Ai kod nuk është i vlefshëm ose ka skaduar. Kërkoni një kod të ri.",
          ),
        );
        return;
      }

      if (!result.data?.user) {
        setError(
          t(
            "Sign-in could not be confirmed. Try again.",
            "Најавата не успеа. Обидете се повторно.",
            "Hyrja nuk mund të konfirmohej. Provoni përsëri.",
          ),
        );
        return;
      }

      setStatus(
        t(
          purpose === "client"
            ? "Signed in. Opening your account…"
            : "Signed in. Opening your studio…",
          purpose === "client"
            ? "Успешна најава. Ја отвораме вашата сметка…"
            : "Успешна најава. Го отвораме вашето студио…",
          purpose === "client"
            ? "U identifikuat. Po hapim llogarinë tuaj…"
            : "U identifikuat. Po hapim studion tuaj…",
        ),
      );
    } catch (caught) {
      setError(
        t(
          networkErrorMessage(caught),
          "Врската не успеа. Обидете се повторно.",
          "Lidhja dështoi. Provoni përsëri.",
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
          {t(
            "Opening your studio…",
            "Го отвораме вашето студио…",
            "Po hapim studion tuaj…",
          )}
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
                : t(
                    "Check your email",
                    "Проверете ја вашата е-пошта",
                    "Kontrolloni emailin tuaj",
                  )}
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
                    `Shënoni kodin gjashtëshifror të dërguar në ${email}.`,
                  )}
            </p>
          </header>

          {step === "email" ? (
            <form onSubmit={sendCode} className="mt-8">
              <FieldGroup className="gap-5">
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel data-replay-public htmlFor="auth-email">
                    {t("Email address", "Е-пошта", "Adresa e emailit")}
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
                      "Do t'ju dërgojmë një kod gjashtëshifror me email. Nuk nevojitet fjalëkalim.",
                    )}
                  </FieldDescription>
                </Field>
                {captchaPolicy?.required && captchaPolicy.siteKey ? (
                  <AuthCaptcha
                    key={captchaGeneration}
                    siteKey={captchaPolicy.siteKey}
                    onToken={setCaptchaToken}
                    onError={captchaError}
                  />
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full"
                  disabled={
                    isSubmitting ||
                    !captchaPolicy ||
                    captchaUnavailable ||
                    (captchaPolicy.required && !captchaToken)
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      {t(
                        "Sending code…",
                        "Испраќање код…",
                        "Duke dërguar kodin…",
                      )}
                    </>
                  ) : (
                    <>
                      {t(
                        "Continue with email",
                        "Продолжи со е-пошта",
                        "Vazhdo me email",
                      )}
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
                    {t("Sign-in code", "Код за најава", "Kodi i hyrjes")}
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
                      {t(
                        "Checking code…",
                        "Проверка на кодот…",
                        "Duke kontrolluar kodin…",
                      )}
                    </>
                  ) : (
                    <>
                      {t(
                        "Verify and continue",
                        "Потврди и продолжи",
                        "Verifiko dhe vazhdo",
                      )}
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </>
                  )}
                </Button>
                {showResendCaptcha &&
                captchaPolicy?.required &&
                captchaPolicy.siteKey ? (
                  <AuthCaptcha
                    key={captchaGeneration}
                    siteKey={captchaPolicy.siteKey}
                    onToken={setCaptchaToken}
                    onError={captchaError}
                  />
                ) : null}
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
                    {t("Change email", "Промени е-пошта", "Ndrysho emailin")}
                  </Button>
                  <Button
                    data-replay-public
                    type="button"
                    variant="link"
                    size="sm"
                    className="px-0"
                    onClick={() => void sendCode()}
                    disabled={
                      isSubmitting || !captchaPolicy || captchaUnavailable
                    }
                  >
                    {t("Send again", "Испрати повторно", "Dërgo përsëri")}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

      <div aria-live="polite" className="mt-5 min-h-5 text-sm">
        {error ? <p className="text-destructive">{error}</p> : null}
        {!error && captchaUnavailable ? (
          <p className="text-destructive">
            {t(
              "Sign-in is temporarily unavailable. Please try again later.",
              "Најавата е привремено недостапна. Обидете се повторно подоцна.",
              "Hyrja është përkohësisht e padisponueshme. Ju lutemi provoni përsëri më vonë.",
            )}
          </p>
        ) : null}
        {!error && status ? (
          <p className="text-muted-foreground">{status}</p>
        ) : null}
      </div>
    </section>
  );
}
