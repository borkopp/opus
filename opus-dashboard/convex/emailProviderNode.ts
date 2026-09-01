"use node";

import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const smtpResultValidator = v.union(
  v.object({
    ok: v.literal(true),
    messageId: v.optional(v.string()),
  }),
  v.object({
    ok: v.literal(false),
    errorCode: v.optional(v.string()),
    statusCode: v.optional(v.number()),
    message: v.string(),
    retryable: v.boolean(),
    fallbackAllowed: v.boolean(),
  }),
);

function compactMessage(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

function senderDomain(from: string) {
  const bracketed = from.match(/<\s*([^<>\s]+@([^<>\s]+))\s*>\s*$/);
  if (bracketed?.[2]) return bracketed[2].toLowerCase();
  const bare = from.trim().match(/^[^\s@]+@([^\s@]+)$/);
  return bare?.[1]?.toLowerCase() || "opus.mk";
}

function deterministicMessageId(idempotencyKey: string, from: string) {
  const digest = createHash("sha256")
    .update(idempotencyKey)
    .digest("hex")
    .slice(0, 32);
  return `<opus-${digest}@${senderDomain(from)}>`;
}

type SmtpError = Error & {
  code?: string;
  responseCode?: number;
};

function classifySmtpError(error: unknown) {
  const smtpError = error instanceof Error ? (error as SmtpError) : undefined;
  const code = smtpError?.code;
  const statusCode = smtpError?.responseCode;
  const connectionFailure = [
    "ETIMEDOUT",
    "ECONNECTION",
    "ESOCKET",
    "ECONNRESET",
    "ENOTFOUND",
    "EAI_AGAIN",
  ].includes(code ?? "");
  const temporarySmtpFailure =
    statusCode === 421 ||
    statusCode === 450 ||
    statusCode === 451 ||
    statusCode === 452;
  const authenticationFailure =
    code === "EAUTH" || statusCode === 530 || statusCode === 535;
  const retryable = connectionFailure || temporarySmtpFailure;
  return {
    ok: false as const,
    errorCode: code,
    statusCode,
    message: compactMessage(
      smtpError?.message || "Sender SMTP delivery failed.",
    ),
    retryable,
    fallbackAllowed: retryable || authenticationFailure,
  };
}

export const sendSenderSmtp = internalAction({
  args: {
    from: v.string(),
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          filename: v.string(),
          content: v.string(),
        }),
      ),
    ),
    idempotencyKey: v.string(),
  },
  returns: smtpResultValidator,
  handler: async (_ctx, args) => {
    const user = process.env.SENDER_SMTP_USER?.trim();
    const password = process.env.SENDER_SMTP_PASSWORD?.trim();
    if (!user || !password) {
      return {
        ok: false as const,
        errorCode: "not_configured",
        message:
          "SENDER_SMTP_USER and SENDER_SMTP_PASSWORD are required for Sender attachments.",
        retryable: false,
        fallbackAllowed: true,
      };
    }

    const configuredPort = Number(process.env.SENDER_SMTP_PORT || "587");
    if (!Number.isInteger(configuredPort) || configuredPort <= 0) {
      return {
        ok: false as const,
        errorCode: "invalid_configuration",
        message: "SENDER_SMTP_PORT must be a positive integer.",
        retryable: false,
        fallbackAllowed: true,
      };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SENDER_SMTP_HOST?.trim() || "smtp.sender.net",
      port: configuredPort,
      secure: configuredPort === 465,
      requireTLS: configuredPort !== 465,
      auth: { user, pass: password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: { minVersion: "TLSv1.2" },
    });

    try {
      const info = await transporter.sendMail({
        from: args.from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
        messageId: deterministicMessageId(args.idempotencyKey, args.from),
        headers: { "X-OPUS-Delivery-ID": args.idempotencyKey },
        attachments: args.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: Buffer.from(attachment.content, "base64"),
          ...(attachment.filename.toLowerCase().endsWith(".ics")
            ? { contentType: "text/calendar; charset=utf-8; method=PUBLISH" }
            : {}),
        })),
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      return {
        ok: true as const,
        messageId:
          typeof info.messageId === "string" ? info.messageId : undefined,
      };
    } catch (error) {
      return classifySmtpError(error);
    } finally {
      transporter.close();
    }
  },
});
