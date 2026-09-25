"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupTextarea } from "@/components/ui/input-group";
import { Send } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function StaffReply({
  orgId,
  conversationId,
}: {
  orgId: Id<"orgs">;
  conversationId: Id<"ai_conversations">;
}) {
  const { t } = useDashboardI18n();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const reply = useMutation(api.ai.conversations.replyAsStaff);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending || !text.trim()) return;
    setSending(true);
    try {
      await reply({ orgId, conversationId, text });
      setText("");
      toast.success(t("Reply queued", "Одговорот е ставен во редица"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("Unable to send reply.", "Одговорот не може да се испрати."),
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <form
      onSubmit={send}
      className="shrink-0 border-t border-border/50 bg-card p-4 sm:p-5"
    >
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor="staff-reply">
            {t("Reply as your team", "Одговорете како тим")}
          </FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              id="staff-reply"
              placeholder={t("Write a reply…", "Напишете одговор…")}
              className="max-h-32 min-h-20"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1_000}
              rows={2}
              disabled={sending}
            />
          </InputGroup>
          <FieldDescription>
            {t(
              "Sending a reply pauses AI for this conversation. Instagram allows replies within 24 hours of the client’s last message.",
              "Испраќањето одговор го паузира AI за овој разговор. Instagram дозволува одговори во рок од 24 часа од последната порака на клиентот.",
            )}
          </FieldDescription>
        </Field>
        <Button
          type="submit"
          className="self-end"
          disabled={sending || !text.trim()}
        >
          {sending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Send data-icon="inline-start" />
          )}
          {t("Send reply", "Испрати одговор")}
        </Button>
      </FieldGroup>
    </form>
  );
}
