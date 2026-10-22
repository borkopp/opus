"use client";

import { useEffect, useState } from "react";
import { AlertDialog } from "radix-ui";
import { AlertTriangle } from "lucide-react";
import type { OrganizationCleanupPreview } from "../../../shared/owner-controls";
import { OWNER_DELETE_HOLD_MS } from "../../../shared/owner-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HoldButton } from "@/components/ui/hold-button";
import { ownerControl } from "@/lib/owner-controls-client";

export function DeleteOrganizationDialog({
  orgId,
  onClose,
  onDeleted,
  onExpired,
}: {
  orgId: string;
  onClose: () => void;
  onDeleted: () => void;
  onExpired: () => void;
}) {
  const [preview, setPreview] = useState<OrganizationCleanupPreview | null>(
    null,
  );
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void ownerControl<OrganizationCleanupPreview>(
      { action: "previewDeletion", orgId },
      onExpired,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) setPreview(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Couldn’t inspect this studio.",
          );
      });
    return () => controller.abort();
  }, [orgId, onExpired, revision]);
  const refresh = () => {
    setPreview(null);
    setError("");
    setSlug("");
    setRevision((n) => n + 1);
  };
  const remove = async () => {
    if (!preview || busy || slug !== preview.slug || preview.blockers.length)
      return;
    setBusy(true);
    setError("");
    try {
      await ownerControl(
        {
          action: "delete",
          orgId,
          confirmationId: preview.confirmationId,
          slug,
        },
        onExpired,
      );
      onDeleted();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn’t complete deletion.",
      );
      setAttempt((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[92svh] w-[calc(100%_-_2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-background shadow-xl"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <div className="border-b p-5">
            <AlertDialog.Title className="flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="size-5 text-destructive" />
              Delete organization
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
              {preview ? (
                <>
                  Permanently remove{" "}
                  <strong className="text-foreground">{preview.name}</strong> (
                  {preview.slug}). This cannot be undone.
                </>
              ) : (
                "Checking the exact records and images before deletion."
              )}
            </AlertDialog.Description>
          </div>
          <div className="min-h-0 overflow-y-auto p-5">
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            {!preview && !error && (
              <p role="status" className="text-sm">
                Counting records and checking shared images…
              </p>
            )}
            {preview && (
              <div className="space-y-5 text-sm">
                {preview.blockers.length > 0 && (
                  <div
                    role="alert"
                    className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                  >
                    {preview.blockers.map((text) => (
                      <p key={text}>{text}</p>
                    ))}
                  </div>
                )}
                <section aria-labelledby="cleanup-remove">
                  <h3 id="cleanup-remove" className="font-semibold">
                    Will be removed
                  </h3>
                  <dl className="mt-2 divide-y">
                    {preview.remove.map((row) => (
                      <div
                        key={row.key}
                        className="flex justify-between gap-4 py-2"
                      >
                        <dt>{row.label}</dt>
                        <dd className="shrink-0 font-medium tabular-nums">
                          {row.count.toLocaleString()}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section
                  aria-labelledby="cleanup-keep"
                  className="rounded-lg bg-muted/50 p-3"
                >
                  <h3 id="cleanup-keep" className="font-semibold">
                    Will be kept
                  </h3>
                  <p className="mt-2">
                    All client accounts and sign-in identities.
                  </p>
                  <dl className="mt-2 space-y-2">
                    {preview.retain
                      .filter((row) => row.count > 0)
                      .map((row) => (
                        <div
                          key={row.key}
                          className="flex justify-between gap-4"
                        >
                          <dt>{row.label}</dt>
                          <dd className="shrink-0 font-medium tabular-nums">
                            {row.count.toLocaleString()}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </section>
                <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                  {preview.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3 border-t p-5">
            {preview && preview.blockers.length === 0 && (
              <>
                <Label htmlFor="delete-org-slug">
                  Type{" "}
                  <span className="break-all font-mono">{preview.slug}</span> to
                  confirm
                </Label>
                <Input
                  id="delete-org-slug"
                  autoComplete="off"
                  spellCheck={false}
                  value={slug}
                  disabled={busy}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <HoldButton
                  key={`${preview.confirmationId}:${attempt}:${slug === preview.slug}`}
                  duration={OWNER_DELETE_HOLD_MS}
                  disabled={slug !== preview.slug}
                  busy={busy}
                  onConfirm={() => void remove()}
                />
                <p className="text-xs text-muted-foreground">
                  Hold with your mouse, touch, or Space / Enter. Releasing early
                  cancels.
                </p>
              </>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="ghost"
                disabled={busy || (!preview && !error)}
                onClick={refresh}
              >
                Refresh preview
              </Button>
              <AlertDialog.Cancel asChild>
                <Button variant="outline" disabled={busy}>
                  Keep organization
                </Button>
              </AlertDialog.Cancel>
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
