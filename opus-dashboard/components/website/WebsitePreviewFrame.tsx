"use client";

import { useEffect, useState } from "react";
import { WebsiteCanvas } from "./WebsiteCanvas";
import type {
  WebsitePreviewState,
  WebsitePreviewCommand,
  WebsitePreviewEvent,
} from "./preview-protocol";

export function WebsitePreviewFrame() {
  const [state, setState] = useState<WebsitePreviewState | null>(null);
  const send = (event: WebsitePreviewEvent) =>
    window.parent.postMessage(event, window.location.origin);
  useEffect(() => {
    if (window.parent === window) return;
    const receive = (event: MessageEvent<WebsitePreviewCommand>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent
      )
        return;
      if (event.data?.type === "opus-sites-update") setState(event.data.state);
      if (event.data?.type === "opus-sites-scroll")
        document
          .querySelector(`[data-site-section="${event.data.panel}"]`)
          ?.scrollIntoView({ block: "start", behavior: "instant" });
    };
    window.addEventListener("message", receive);
    const guardLinks = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a");
      if (link && !link.getAttribute("href")?.startsWith("#"))
        event.preventDefault();
    };
    document.addEventListener("click", guardLinks, true);
    send({ type: "opus-sites-ready" });
    return () => {
      window.removeEventListener("message", receive);
      document.removeEventListener("click", guardLinks, true);
    };
  }, []);
  if (!state)
    return <div className="opus-site-preview-loading" aria-busy="true" />;
  return (
    <div data-replay-private>
      <WebsiteCanvas
        site={state.site}
        design={state.design}
        locale={state.locale}
        onLocaleChange={(locale) => send({ type: "opus-sites-locale", locale })}
        editing={
          state.mode === "edit"
            ? {
                selected: state.selected,
                select: (panel) => send({ type: "opus-sites-select", panel }),
                content: (key, value) =>
                  send({ type: "opus-sites-content", key, value }),
              }
            : undefined
        }
      />
    </div>
  );
}
