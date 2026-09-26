"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { CopyButton } from "@/components/promotions/CopyButton";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  REPLY_TOKENS,
  renderReplyTemplate,
  unsupportedReplyTokens,
  type PromotionLanguage,
} from "@/convex/lib/promotionTemplates";
import type { PromotionWorkspace } from "@/lib/promotions";

type EditableReply = {
  id?: Id<"saved_replies">;
  title: string;
  body: string;
  updatedAt?: number;
};
type SaveReply = (
  reply: EditableReply & { language: PromotionLanguage },
) => Promise<void>;

export function SavedReplies({
  data,
  language,
}: {
  data: PromotionWorkspace;
  language: PromotionLanguage;
}) {
  const save = useMutation(api.promotions.saveReply);
  const remove = useMutation(api.promotions.removeReply);
  return (
    <SavedRepliesView
      data={data}
      language={language}
      onSave={async (reply) => {
        await save({
          id: reply.id,
          title: reply.title,
          body: reply.body,
          language: reply.language,
          expectedUpdatedAt: reply.updatedAt,
        });
      }}
      onRemove={async (reply) => {
        if (reply.id && reply.updatedAt !== undefined)
          await remove({ id: reply.id, expectedUpdatedAt: reply.updatedAt });
      }}
    />
  );
}

export function SavedRepliesView({
  data,
  language,
  onSave,
  onRemove,
}: {
  data: PromotionWorkspace;
  language: PromotionLanguage;
  onSave: SaveReply;
  onRemove: (reply: EditableReply) => Promise<void>;
}) {
  const { t } = useDashboardI18n();
  const [editing, setEditing] = useState<EditableReply | null>(null);
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 data-replay-public className="text-xl font-medium">
            {t(
              "A thoughtful reply, without the typing.",
              "Внимателен одговор, без повторно пишување.",
            )}
          </h2>
          <p
            data-replay-public
            className="mt-2 text-sm leading-relaxed text-muted-foreground"
          >
            {t(
              "Copy a reply into Instagram or any conversation. Studio details update automatically; you choose when to send.",
              "Копирајте одговор во Instagram или во кој било разговор. Податоците за студиото се ажурираат автоматски, а вие избирате кога да испратите.",
            )}
          </p>
        </div>
        {data.canManageReplies && (
          <Button
            data-replay-public
            onClick={() => setEditing({ title: "", body: "" })}
          >
            <Plus data-icon="inline-start" />
            {t("New reply", "Нов одговор")}
          </Button>
        )}
      </div>
      <section className="flex flex-col gap-4">
        <h3
          data-replay-public
          className="text-sm font-medium text-muted-foreground"
        >
          {t("Ready to use", "Подготвени за користење")}
        </h3>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {data.starters.map((reply) => (
            <ReplyCard
              key={reply.key}
              reply={reply}
              canEdit={data.canManageReplies}
              onEdit={() =>
                setEditing({ title: reply.title, body: reply.body })
              }
              starter
            />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h3
          data-replay-public
          className="text-sm font-medium text-muted-foreground"
        >
          {t("Your team's replies", "Одговори на вашиот тим")}
        </h3>
        {data.replies.length ? (
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {data.replies.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                canEdit={data.canManageReplies}
                onEdit={() => setEditing(reply)}
              />
            ))}
          </div>
        ) : (
          <Empty className="rounded-2xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquareText />
              </EmptyMedia>
              <EmptyTitle>
                {t(
                  "Keep your best replies here",
                  "Зачувајте ги вашите најкорисни одговори",
                )}
              </EmptyTitle>
              <EmptyDescription>
                {data.canManageReplies
                  ? t(
                      "Customize a starter or write a reply for the questions you hear most.",
                      "Приспособете подготвен одговор или напишете одговор на најчестите прашања.",
                    )
                  : t(
                      "Your owner or manager can add replies for the whole team.",
                      "Сопственикот или менаџерот може да додаде одговори за целиот тим.",
                    )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
      {editing && (
        <ReplyEditor
          reply={editing}
          language={language}
          data={data}
          onClose={() => setEditing(null)}
          onSave={onSave}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}

function ReplyCard({
  reply,
  canEdit,
  onEdit,
  starter = false,
}: {
  reply: { title: string; text: string; missing: string[] };
  canEdit: boolean;
  onEdit: () => void;
  starter?: boolean;
}) {
  const { t } = useDashboardI18n();
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{reply.title}</CardTitle>
        {reply.missing.length > 0 && (
          <CardDescription data-replay-public>
            {t(
              "Add the missing studio details or customize this reply before copying.",
              "Додајте ги податоците што недостигаат или приспособете го одговорот пред копирање.",
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
          {reply.text}
        </p>
      </CardContent>
      <CardFooter className="mb-5 flex-wrap gap-2">
        <CopyButton
          text={reply.text}
          disabled={reply.missing.length > 0}
          label={t("Copy reply", "Копирај одговор")}
        />
        {canEdit && (
          <Button
            data-replay-public
            variant="ghost"
            onClick={onEdit}
            aria-label={`${t("Edit", "Уреди")}: ${reply.title}`}
          >
            <Pencil data-icon="inline-start" />
            {starter ? t("Customize", "Приспособи") : t("Edit", "Уреди")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function ReplyEditor({
  reply,
  language,
  data,
  onClose,
  onSave,
  onRemove,
}: {
  reply: EditableReply;
  language: PromotionLanguage;
  data: PromotionWorkspace;
  onClose: () => void;
  onSave: SaveReply;
  onRemove: (reply: EditableReply) => Promise<void>;
}) {
  const { t } = useDashboardI18n();
  const [title, setTitle] = useState(reply.title);
  const [body, setBody] = useState(reply.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const preview = renderReplyTemplate(body, data.values);
  const labels = {
    studio_name: t("Studio name", "Име на студиото"),
    booking_link: t("Booking link", "Линк за закажување"),
    address: t("Address", "Адреса"),
    phone: t("Phone", "Телефон"),
    hours: t("Hours", "Работно време"),
    services: t("Services & prices", "Услуги и цени"),
  };
  async function submit(remove = false) {
    setError("");
    if (
      !remove &&
      (!title.trim() || !body.trim() || unsupportedReplyTokens(body).length)
    ) {
      setError(
        t(
          "Add a title and message, using only the studio details below.",
          "Внесете наслов и порака користејќи ги само податоците за студиото подолу.",
        ),
      );
      return;
    }
    setBusy(true);
    try {
      if (remove) await onRemove(reply);
      else await onSave({ ...reply, title, body, language });
      toast.success(
        remove
          ? t("Reply removed", "Одговорот е отстранет")
          : t("Reply saved for your team", "Одговорот е зачуван за вашиот тим"),
      );
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t(
              "Could not save the reply.",
              "Не успеа зачувувањето на одговорот.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle data-replay-public>
            {confirmRemove
              ? t("Remove this reply?", "Да се отстрани одговорот?")
              : reply.id
                ? t("Edit reply", "Уреди одговор")
                : t("New saved reply", "Нов зачуван одговор")}
          </DialogTitle>
          <DialogDescription data-replay-public>
            {confirmRemove
              ? t(
                  "It will be removed from your team's saved replies.",
                  "Ќе биде отстранет од зачуваните одговори на вашиот тим.",
                )
              : t(
                  "Saved replies are shared with your studio team.",
                  "Зачуваните одговори се достапни за тимот на вашето студио.",
                )}
          </DialogDescription>
        </DialogHeader>
        {!confirmRemove && (
          <form
            id="saved-reply-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel data-replay-public htmlFor="reply-title">
                  {t("Title", "Наслов")}
                </FieldLabel>
                <Input
                  autoFocus
                  id="reply-title"
                  value={title}
                  maxLength={80}
                  required
                  disabled={busy}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel data-replay-public htmlFor="reply-body">
                  {t("Message", "Порака")}
                </FieldLabel>
                <Textarea
                  id="reply-body"
                  value={body}
                  maxLength={2000}
                  rows={6}
                  required
                  disabled={busy}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => setBody(event.target.value)}
                />
                <FieldDescription data-replay-public>
                  {t(
                    "Insert a studio detail to keep it up to date automatically.",
                    "Вметнете податок за студиото за автоматски да се ажурира.",
                  )}
                </FieldDescription>
                <div className="flex flex-wrap gap-2">
                  {REPLY_TOKENS.map((token) => (
                    <Button
                      type="button"
                      key={token}
                      variant="outline"
                      size="sm"
                      disabled={busy || body.length + token.length + 5 > 2000}
                      onClick={() =>
                        setBody(
                          (current) =>
                            `${current}${current && !/\s$/.test(current) ? " " : ""}{{${token}}}`,
                        )
                      }
                    >
                      {labels[token]}
                    </Button>
                  ))}
                </div>
              </Field>
              {body && (
                <Field>
                  <FieldLabel data-replay-public>
                    {t("Preview", "Преглед")}
                  </FieldLabel>
                  <p className="max-h-44 overflow-auto rounded-xl bg-muted p-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {preview.text}
                  </p>
                  {preview.missing.length > 0 && (
                    <FieldDescription data-replay-public>
                      {t(
                        "Some studio details are missing. Add them in Settings or edit the message before copying.",
                        "Недостигаат податоци за студиото. Додајте ги во Поставки или уредете ја пораката пред копирање.",
                      )}
                    </FieldDescription>
                  )}
                </Field>
              )}
            </FieldGroup>
          </form>
        )}
        {error && <FieldError>{error}</FieldError>}
        <DialogFooter className="flex-wrap gap-2">
          {confirmRemove ? (
            <>
              <Button
                data-replay-public
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmRemove(false)}
              >
                {t("Keep reply", "Задржи одговор")}
              </Button>
              <Button
                data-replay-public
                variant="destructive"
                disabled={busy}
                onClick={() => void submit(true)}
              >
                {t("Remove reply", "Отстрани одговор")}
              </Button>
            </>
          ) : (
            <>
              {reply.id && (
                <Button
                  data-replay-public
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirmRemove(true)}
                >
                  <Trash2 data-icon="inline-start" />
                  {t("Remove", "Отстрани")}
                </Button>
              )}
              <Button
                data-replay-public
                variant="outline"
                disabled={busy}
                onClick={onClose}
              >
                {t("Cancel", "Откажи")}
              </Button>
              <Button
                data-replay-public
                form="saved-reply-form"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? t("Saving…", "Се зачувува…")
                  : t("Save reply", "Зачувај одговор")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
