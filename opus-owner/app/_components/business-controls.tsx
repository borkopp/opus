"use client";

import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { X, Trash2 } from "lucide-react";
import {
  OWNER_MAX_PROMPTS,
  type AssistantAllowance,
} from "../../../shared/owner-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ownerControl } from "@/lib/owner-controls-client";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";

export function BusinessControls({
  business,
  onClose,
  onDeleted,
  onExpired,
}: {
  business: { id: string; name: string; slug: string };
  onClose: () => void;
  onDeleted: () => void;
  onExpired: () => void;
}) {
  const [data, setData] = useState<AssistantAllowance | null>(null);
  const [limit, setLimit] = useState("");
  const [deep, setDeep] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void ownerControl<AssistantAllowance>(
      { action: "allowance", orgId: business.id },
      onExpired,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setLimit(String(result.limit));
          setDeep(String(result.deepLimit));
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Couldn’t load allowance.",
          );
      });
    return () => controller.abort();
  }, [business.id, onExpired, revision]);
  async function update(operation: "reset" | "defaults" | "custom") {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await ownerControl<AssistantAllowance>(
        {
          action: "setAllowance",
          orgId: business.id,
          operation,
          ...(operation === "custom"
            ? { limit: Number(limit), deepLimit: Number(deep) }
            : {}),
        },
        onExpired,
      );
      setData(result);
      setLimit(String(result.limit));
      setDeep(String(result.deepLimit));
      setNotice(
        operation === "reset"
          ? "This month’s usage and allowance budget have been reset. Chat history and actual provider costs are retained."
          : operation === "defaults"
            ? "Plan defaults restored. Usage is unchanged."
            : "Custom monthly allowance saved. Usage is unchanged.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn’t update allowance.",
      );
    } finally {
      setBusy(false);
    }
  }
  const invalid =
    !/^\d+$/.test(limit) ||
    !/^\d+$/.test(deep) ||
    Number(limit) > OWNER_MAX_PROMPTS ||
    Number(deep) > Number(limit);
  return (
    <>
      <Dialog.Root
        open
        onOpenChange={(open) => {
          if (!open && !busy && !deleting) onClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-40 max-h-[90svh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-background p-5 shadow-xl sm:p-6">
            <Dialog.Title className="pr-10 text-lg font-semibold">
              Owner controls
            </Dialog.Title>
            <Dialog.Description className="mt-1 break-words text-sm text-muted-foreground">
              {business.name} · {business.slug}
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-3 top-3"
                disabled={busy}
                aria-label="Close owner controls"
              >
                <X />
              </Button>
            </Dialog.Close>
            <section
              className="mt-6 space-y-4"
              aria-labelledby="allowance-title"
            >
              <h2 id="allowance-title" className="font-semibold">
                AI Assistant allowance
              </h2>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              {notice && (
                <p role="status" className="rounded-lg bg-muted p-3 text-sm">
                  {notice}
                </p>
              )}
              {!data && !error && (
                <p role="status" className="text-sm text-muted-foreground">
                  Loading current usage…
                </p>
              )}
              {data && (
                <>
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Prompts used
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {data.used} / {data.limit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Detailed used
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {data.deepUsed} / {data.deepLimit}
                      </p>
                    </div>
                    <p className="col-span-2 text-xs text-muted-foreground">
                      {data.plan === "paid" ? "Pro" : "Free"} ·{" "}
                      {data.custom ? "Custom allowance" : "Plan defaults"} ·
                      Resets{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Europe/Skopje",
                      }).format(data.resetAt)}
                    </p>
                  </div>
                  {data.busy && (
                    <p role="status" className="text-sm text-muted-foreground">
                      An answer is in progress. Refresh after it finishes to
                      change the allowance.
                    </p>
                  )}
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!invalid) void update("custom");
                    }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="prompt-limit">Monthly prompts</Label>
                        <Input
                          id="prompt-limit"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={OWNER_MAX_PROMPTS}
                          step={1}
                          required
                          disabled={busy || data.busy}
                          value={limit}
                          onChange={(e) => setLimit(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deep-limit">Of those, detailed</Label>
                        <Input
                          id="deep-limit"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={Number(limit)}
                          step={1}
                          required
                          disabled={busy || data.busy || data.plan === "free"}
                          value={deep}
                          onChange={(e) => setDeep(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Custom totals apply every month until restored. Detailed
                      prompts require Pro and count toward the total. Setting 0
                      pauses new prompts.
                    </p>
                    <Button
                      type="submit"
                      disabled={busy || data.busy || invalid}
                      className="h-11 w-full"
                    >
                      {busy ? "Saving…" : "Save custom allowance"}
                    </Button>
                  </form>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy || data.busy}
                      onClick={() => void update("reset")}
                    >
                      Reset this month’s usage
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy || data.busy || !data.custom}
                      onClick={() => void update("defaults")}
                    >
                      Restore defaults
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Defaults: {data.defaultLimit} prompts, including{" "}
                    {data.defaultDeepLimit} detailed. Provider budget still
                    applies: ${(data.budgetUsedMicroUsd / 1_000_000).toFixed(2)}{" "}
                    of ${(data.budgetMicroUsd / 1_000_000).toFixed(2)} used
                    since the last reset.
                  </p>
                </>
              )}
              <Button
                variant="link"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setRevision((n) => n + 1);
                }}
              >
                Refresh usage
              </Button>
            </section>
            <section
              className="mt-5 border-t pt-5"
              aria-labelledby="cleanup-title"
            >
              <h2 id="cleanup-title" className="font-semibold">
                Delete organization
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Remove a test studio, its website and studio data. Review
                exactly what will be removed and which client history will be
                kept.
              </p>
              <Button
                variant="outline"
                className="mt-4 h-11 border-destructive/30 text-destructive"
                disabled={busy}
                onClick={() => setDeleting(true)}
              >
                <Trash2 />
                Review deletion
              </Button>
            </section>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {deleting && (
        <DeleteOrganizationDialog
          orgId={business.id}
          onClose={() => setDeleting(false)}
          onDeleted={onDeleted}
          onExpired={onExpired}
        />
      )}
    </>
  );
}
