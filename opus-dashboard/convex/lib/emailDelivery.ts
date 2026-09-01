import type { EmailAttachment } from "./emailTemplates";
import type {
  EmailProviderAttempt,
  EmailProviderAttemptStatus,
  EmailProviderName,
  EmailProviderTransport,
} from "./emailDeliveryTypes";

export type EmailRoute = "auth" | "booking" | "reminder";

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  idempotencyKey: string;
  tags?: Array<{ name: string; value: string }>;
};

export type SenderSmtpResult =
  | { ok: true; messageId?: string }
  | {
      ok: false;
      errorCode?: string;
      statusCode?: number;
      message: string;
      retryable: boolean;
      fallbackAllowed: boolean;
    };

export type SenderSmtpSend = (
  message: EmailMessage,
) => Promise<SenderSmtpResult>;

export type EmailDeliveryResult = {
  provider: EmailProviderName;
  externalMessageId?: string;
  attempts: EmailProviderAttempt[];
};

type ProviderErrorOptions = {
  attemptStatus?: EmailProviderAttemptStatus;
  statusCode?: number;
  errorCode?: string;
  retryable: boolean;
  fallbackAllowed: boolean;
};

class ProviderSendError extends Error {
  readonly attemptStatus: EmailProviderAttemptStatus;
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly retryable: boolean;
  readonly fallbackAllowed: boolean;

  constructor(message: string, options: ProviderErrorOptions) {
    super(message);
    this.name = "ProviderSendError";
    this.attemptStatus = options.attemptStatus ?? "failed";
    this.statusCode = options.statusCode;
    this.errorCode = options.errorCode;
    this.retryable = options.retryable;
    this.fallbackAllowed = options.fallbackAllowed;
  }
}

export class EmailDeliveryFailure extends Error {
  readonly attempts: EmailProviderAttempt[];
  readonly retryable: boolean;

  constructor(attempts: EmailProviderAttempt[]) {
    const lastAttempt = attempts[attempts.length - 1];
    super(
      lastAttempt?.failureReason ?? "No email provider accepted the message.",
    );
    this.name = "EmailDeliveryFailure";
    this.attempts = attempts;
    this.retryable = lastAttempt?.fallbackAllowed
      ? attempts.some((attempt) => attempt.retryable)
      : (lastAttempt?.retryable ?? false);
  }
}

const DEFAULT_PROVIDER_ORDER: EmailProviderName[] = ["resend"];
const PROVIDERS = new Set<EmailProviderName>(["resend", "sender"]);

function providerOrderEnvironmentName(route: EmailRoute) {
  switch (route) {
    case "auth":
      return "AUTH_EMAIL_PROVIDERS";
    case "booking":
      return "BOOKING_EMAIL_PROVIDERS";
    case "reminder":
      return "REMINDER_EMAIL_PROVIDERS";
  }
}

export function providerOrderForRoute(route: EmailRoute): EmailProviderName[] {
  const environmentName = providerOrderEnvironmentName(route);
  const configured = process.env[environmentName]?.trim();
  if (!configured) return [...DEFAULT_PROVIDER_ORDER];

  const providers: EmailProviderName[] = [];
  for (const rawProvider of configured.split(",")) {
    const provider = rawProvider.trim().toLowerCase();
    if (!provider) continue;
    if (!PROVIDERS.has(provider as EmailProviderName)) {
      throw new Error(
        `${environmentName} contains unsupported provider "${provider}".`,
      );
    }
    const typedProvider = provider as EmailProviderName;
    if (!providers.includes(typedProvider)) providers.push(typedProvider);
  }

  if (providers.length === 0) {
    throw new Error(`${environmentName} must contain at least one provider.`);
  }
  return providers;
}

export function emailFromForRoute(
  route: EmailRoute,
  provider: EmailProviderName = "resend",
) {
  const routeDefault =
    route === "auth"
      ? process.env.AUTH_EMAIL_FROM?.trim()
      : process.env.BOOKING_EMAIL_FROM?.trim() ||
        process.env.AUTH_EMAIL_FROM?.trim();
  const senderOverride =
    provider === "sender"
      ? route === "auth"
        ? process.env.SENDER_AUTH_EMAIL_FROM?.trim()
        : process.env.SENDER_BOOKING_EMAIL_FROM?.trim()
      : undefined;
  const value = senderOverride || routeDefault;
  if (!value) {
    throw new Error(
      route === "auth"
        ? "Email delivery requires AUTH_EMAIL_FROM."
        : "Email delivery requires BOOKING_EMAIL_FROM or AUTH_EMAIL_FROM.",
    );
  }
  return value.includes("<") ? value : `OPUS <${value}>`;
}

export function emailRouteForNotificationType(type: string): EmailRoute {
  if (type === "booking_verification") return "auth";
  if (
    [
      "booking_reminder",
      "staff_booking_reminder",
      "review_request",
      "no_show_warning",
      "gap_fill_offer",
    ].includes(type)
  ) {
    return "reminder";
  }
  return "booking";
}

function compactFailureReason(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

function parseFromAddress(value: string) {
  const bracketed = value.match(/^\s*(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/);
  if (bracketed) {
    const rawName = bracketed[1].trim().replace(/^"|"$/g, "");
    return { name: rawName || "OPUS", email: bracketed[2].trim() };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return { name: "OPUS", email: value.trim() };
  }
  throw new ProviderSendError("The configured sender address is invalid.", {
    errorCode: "invalid_from_address",
    retryable: false,
    fallbackAllowed: false,
  });
}

async function responseError(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const nestedError =
      parsed.error !== null && typeof parsed.error === "object"
        ? (parsed.error as Record<string, unknown>)
        : undefined;
    const code = [
      parsed.name,
      parsed.code,
      parsed.type,
      nestedError?.name,
      nestedError?.code,
      nestedError?.type,
    ].find((value): value is string => typeof value === "string");
    const message = [
      parsed.message,
      nestedError?.message,
      typeof parsed.error === "string" ? parsed.error : undefined,
    ].find((value): value is string => typeof value === "string");
    return {
      code,
      message: compactFailureReason(
        message || text || `Provider returned ${response.status}.`,
      ),
    };
  } catch {
    return {
      code: undefined,
      message: compactFailureReason(
        text || `Provider returned ${response.status}.`,
      ),
    };
  }
}

function retryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function resendFallbackAllowed(status: number, code?: string) {
  return (
    retryableStatus(status) ||
    status === 401 ||
    [
      "daily_quota_exceeded",
      "monthly_quota_exceeded",
      "restricted_api_key",
      "invalid_api_key",
    ].includes(code ?? "")
  );
}

async function sendWithResend(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new ProviderSendError("RESEND_API_KEY is not configured.", {
      attemptStatus: "skipped",
      errorCode: "not_configured",
      retryable: false,
      fallbackAllowed: true,
    });
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.attachments?.length
          ? { attachments: message.attachments }
          : {}),
        ...(message.tags?.length ? { tags: message.tags } : {}),
      }),
    });
  } catch (error) {
    throw new ProviderSendError(
      compactFailureReason(
        error instanceof Error
          ? error.message
          : "Resend network request failed.",
      ),
      {
        errorCode: "network_error",
        retryable: true,
        fallbackAllowed: true,
      },
    );
  }

  if (!response.ok) {
    const details = await responseError(response);
    throw new ProviderSendError(
      `Resend returned ${response.status}: ${details.message}`,
      {
        statusCode: response.status,
        errorCode: details.code,
        retryable: retryableStatus(response.status),
        fallbackAllowed: resendFallbackAllowed(response.status, details.code),
      },
    );
  }

  const responseBody = await response.text();
  try {
    const parsed = JSON.parse(responseBody) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

async function sendWithSenderApi(message: EmailMessage) {
  const apiToken = process.env.SENDER_API_TOKEN?.trim();
  if (!apiToken) {
    throw new ProviderSendError("SENDER_API_TOKEN is not configured.", {
      attemptStatus: "skipped",
      errorCode: "not_configured",
      retryable: false,
      fallbackAllowed: true,
    });
  }
  if (message.attachments?.length) {
    throw new ProviderSendError(
      "Sender API requires public attachment URLs; SMTP is required for this message.",
      {
        attemptStatus: "skipped",
        errorCode: "smtp_required",
        retryable: false,
        fallbackAllowed: true,
      },
    );
  }

  const from = parseFromAddress(message.from);
  let response: Response;
  try {
    response = await fetch("https://api.sender.net/v2/message/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: { email: message.to },
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: { "X-OPUS-Delivery-ID": message.idempotencyKey },
      }),
    });
  } catch (error) {
    throw new ProviderSendError(
      compactFailureReason(
        error instanceof Error
          ? error.message
          : "Sender network request failed.",
      ),
      {
        errorCode: "network_error",
        retryable: true,
        fallbackAllowed: true,
      },
    );
  }

  if (!response.ok) {
    const details = await responseError(response);
    const retryable = retryableStatus(response.status);
    throw new ProviderSendError(
      `Sender returned ${response.status}: ${details.message}`,
      {
        statusCode: response.status,
        errorCode: details.code,
        retryable,
        fallbackAllowed: retryable || response.status === 401,
      },
    );
  }

  const responseBody = await response.text();
  try {
    const parsed = JSON.parse(responseBody) as Record<string, unknown>;
    const data =
      parsed.data !== null && typeof parsed.data === "object"
        ? (parsed.data as Record<string, unknown>)
        : undefined;
    const messageId = [parsed.emailId, parsed.id, data?.emailId, data?.id].find(
      (value): value is string => typeof value === "string",
    );
    return messageId;
  } catch {
    return undefined;
  }
}

async function sendWithSender(
  message: EmailMessage,
  senderSmtp?: SenderSmtpSend,
) {
  if (!message.attachments?.length) {
    return {
      transport: "api" as const,
      externalMessageId: await sendWithSenderApi(message),
    };
  }
  if (!senderSmtp) {
    throw new ProviderSendError(
      "Sender SMTP transport is unavailable for an email with attachments.",
      {
        attemptStatus: "skipped",
        errorCode: "smtp_unavailable",
        retryable: false,
        fallbackAllowed: true,
      },
    );
  }
  const result = await senderSmtp(message);
  if (!result.ok) {
    throw new ProviderSendError(compactFailureReason(result.message), {
      statusCode: result.statusCode,
      errorCode: result.errorCode,
      retryable: result.retryable,
      fallbackAllowed: result.fallbackAllowed,
    });
  }
  return { transport: "smtp" as const, externalMessageId: result.messageId };
}

function failedAttempt(
  provider: EmailProviderName,
  transport: EmailProviderTransport,
  attemptedAt: number,
  error: unknown,
): EmailProviderAttempt {
  const providerError =
    error instanceof ProviderSendError
      ? error
      : new ProviderSendError(
          error instanceof Error
            ? error.message
            : "Unknown email provider error.",
          { retryable: false, fallbackAllowed: false },
        );
  return {
    provider,
    transport,
    status: providerError.attemptStatus,
    attemptedAt,
    completedAt: Date.now(),
    statusCode: providerError.statusCode,
    errorCode: providerError.errorCode,
    failureReason: compactFailureReason(providerError.message),
    retryable: providerError.retryable,
    fallbackAllowed: providerError.fallbackAllowed,
  };
}

export async function deliverEmail(
  message: EmailMessage,
  options: {
    providers: EmailProviderName[];
    route?: EmailRoute;
    senderSmtp?: SenderSmtpSend;
  },
): Promise<EmailDeliveryResult> {
  const attempts: EmailProviderAttempt[] = [];

  for (const provider of options.providers) {
    const attemptedAt = Date.now();
    const providerMessage = options.route
      ? {
          ...message,
          from: emailFromForRoute(options.route, provider),
        }
      : message;
    const expectedTransport: EmailProviderTransport =
      provider === "sender" && providerMessage.attachments?.length
        ? "smtp"
        : "api";
    try {
      const delivery =
        provider === "resend"
          ? {
              transport: "api" as const,
              externalMessageId: await sendWithResend(providerMessage),
            }
          : await sendWithSender(providerMessage, options.senderSmtp);
      const attempt: EmailProviderAttempt = {
        provider,
        transport: delivery.transport,
        status: "accepted",
        attemptedAt,
        completedAt: Date.now(),
        externalMessageId: delivery.externalMessageId,
        retryable: false,
        fallbackAllowed: false,
      };
      attempts.push(attempt);
      return {
        provider,
        externalMessageId: delivery.externalMessageId,
        attempts,
      };
    } catch (error) {
      const attempt = failedAttempt(
        provider,
        expectedTransport,
        attemptedAt,
        error,
      );
      attempts.push(attempt);
      if (!attempt.fallbackAllowed) throw new EmailDeliveryFailure(attempts);
    }
  }

  throw new EmailDeliveryFailure(attempts);
}
