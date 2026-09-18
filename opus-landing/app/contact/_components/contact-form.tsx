"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

const FORM_ENDPOINT = "https://formspree.io/f/meaoqnwl";
type Status = "idle" | "submitting" | "success" | "error";
type FieldName = "name" | "email" | "business" | "message";
type FormErrors = Partial<Record<FieldName, string>>;
type ContactField = {
  name: FieldName;
  label: string;
  placeholder: string;
  autoComplete?: string;
  type?: "text" | "email";
  maxLength: number;
  required: boolean;
};

export function ContactForm() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const submitting = status === "submitting";

  const fields: ContactField[] = useMemo(
    () => [
      {
        name: "name",
        label: t.contactPage.fieldName,
        placeholder: t.contactPage.placeholderName,
        autoComplete: "name",
        maxLength: 120,
        required: true,
      },
      {
        name: "email",
        label: t.contactPage.fieldEmail,
        placeholder: t.contactPage.placeholderEmail,
        autoComplete: "email",
        type: "email",
        maxLength: 254,
        required: true,
      },
      {
        name: "business",
        label: t.contactPage.fieldBusiness,
        placeholder: t.contactPage.placeholderBusiness,
        autoComplete: "organization",
        maxLength: 160,
        required: false,
      },
      {
        name: "message",
        label: t.contactPage.fieldMessage,
        placeholder: t.contactPage.placeholderMessage,
        maxLength: 5000,
        required: true,
      },
    ],
    [t],
  );

  useEffect(() => () => pendingRequest.current?.abort(), []);

  useEffect(() => {
    if (status === "success" || status === "error") feedbackRef.current?.focus();
  }, [status]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRequest.current) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    const controller = new AbortController();
    pendingRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setStatus("submitting");
    setErrors({});
    setErrorMessage("");

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (response.ok) {
        form.reset();
        setStatus("success");
        return;
      }

      const result: unknown = await response.json().catch(() => null);
      const fieldErrors: FormErrors = {};
      if (
        result &&
        typeof result === "object" &&
        "errors" in result &&
        Array.isArray(result.errors)
      ) {
        for (const error of result.errors) {
          if (
            error &&
            typeof error === "object" &&
            typeof error.field === "string" &&
            typeof error.message === "string" &&
            fields.some((field) => field.name === error.field)
          )
            fieldErrors[error.field as FieldName] = error.message;
        }
      }
      setErrors(fieldErrors);
      setErrorMessage(
        response.status === 429
          ? t.contactPage.errorRateLimit
          : t.contactPage.errorGeneric,
      );
      setStatus("error");
    } catch {
      setErrorMessage(t.contactPage.errorConnection);
      setStatus("error");
    } finally {
      window.clearTimeout(timeout);
      pendingRequest.current = null;
    }
  }

  function startAnotherMessage() {
    setStatus("idle");
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  return (
    <Card className="contact-form-card">
      <CardHeader className="gap-3 px-8 pt-8 pb-7">
        <CardTitle id="contact-form-title">{t.contactPage.formTitle}</CardTitle>
        <CardDescription>
          {t.contactPage.formDescLine1}
          <br />
          {t.contactPage.formDescLine2}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {status === "success" ? (
          <div className="contact-success">
            <Alert ref={feedbackRef} role="status" tabIndex={-1}>
              <CheckCircle2 aria-hidden="true" />
              <AlertTitle>{t.contactPage.successTitle}</AlertTitle>
              <AlertDescription>{t.contactPage.successDesc}</AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              onClick={startAnotherMessage}
            >
              {t.contactPage.sendAnother}{" "}
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <form
            action={FORM_ENDPOINT}
            method="POST"
            onSubmit={sendMessage}
            aria-labelledby="contact-form-title"
            aria-busy={submitting}
            onInput={() => {
              if (status === "error") {
                setStatus("idle");
                setErrors({});
              }
            }}
          >
            <input
              type="hidden"
              name="_subject"
              value="A new hello from the OPUS website"
            />
            <input
              type="text"
              name="_gotcha"
              className="contact-honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <FieldGroup className="grid gap-5 sm:grid-cols-2">
              {fields.map((field) => {
                const id = `contact-${field.name}`;
                const error = errors[field.name];
                const inputProps = {
                  id,
                  name: field.name,
                  placeholder: field.placeholder,
                  autoComplete: field.autoComplete,
                  maxLength: field.maxLength,
                  required: field.required,
                  disabled: submitting,
                  "aria-invalid": !!error,
                  "aria-describedby": error ? `${id}-error` : undefined,
                };
                return (
                  <Field
                    key={field.name}
                    className={cn(
                      "gap-2",
                      (field.name === "business" ||
                        field.name === "message") &&
                        "sm:col-span-2",
                    )}
                    data-disabled={submitting}
                    data-invalid={!!error}
                  >
                    <FieldLabel htmlFor={id}>
                      {field.label}
                      {!field.required && (
                        <span className="contact-optional">
                          {t.contactPage.optional}
                        </span>
                      )}
                    </FieldLabel>
                    {field.name === "message" ? (
                      <Textarea
                        {...inputProps}
                        rows={5}
                        className="min-h-36 resize-y px-4 py-3"
                      />
                    ) : (
                      <Input
                        {...inputProps}
                        ref={field.name === "name" ? nameRef : undefined}
                        type={field.type ?? "text"}
                        className="h-12 px-4"
                      />
                    )}
                    {error && (
                      <FieldError id={`${id}-error`}>{error}</FieldError>
                    )}
                  </Field>
                );
              })}
              {status === "error" && (
                <Alert
                  ref={feedbackRef}
                  variant="destructive"
                  tabIndex={-1}
                  className="sm:col-span-2"
                >
                  <CircleAlert aria-hidden="true" />
                  <AlertTitle>{t.contactPage.errorTitle}</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full justify-between px-5 sm:col-span-2"
                disabled={submitting}
              >
                {submitting
                  ? t.contactPage.submitting
                  : t.contactPage.submit}
                {submitting ? (
                  <Spinner
                    data-icon="inline-end"
                    aria-hidden="true"
                    className="motion-reduce:animate-none"
                  />
                ) : (
                  <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                )}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
      <CardFooter className="gap-3 px-8 pb-8">
        <ShieldCheck className="contact-privacy-icon" aria-hidden="true" />
        <p className="contact-privacy-note">
          {t.contactPage.privacyNote}
          <br />
          {t.contactPage.readOur}
          <Link href="/privacy">{t.contactPage.privacyLink}</Link>.
        </p>
      </CardFooter>
    </Card>
  );
}
