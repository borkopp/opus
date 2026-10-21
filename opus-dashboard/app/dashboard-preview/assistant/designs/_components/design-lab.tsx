"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Monitor, Smartphone } from "lucide-react";
import { variants, type DesignVariant } from "../_lib/design-data";
import s from "../designs.module.css";

export function AssistantDesignLab({
  initialVariant,
}: {
  initialVariant: DesignVariant;
}) {
  const [variant, setVariant] = useState(initialVariant);
  const [phone, setPhone] = useState(false);
  const [conversation, setConversation] = useState(initialVariant === "desk");
  const active = variants.find((item) => item.id === variant)!;
  const src = `/dashboard-preview/assistant/designs/canvas?variant=${variant}&view=${conversation ? "conversation" : "welcome"}`;
  return (
    <main className={s.lab}>
      <header className={s.labBar}>
        <div className={s.labIdentity}>
          <Link
            href="/dashboard-preview/assistant"
            aria-label="Back to response gallery"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <strong>AI Assistant</strong>
            <span>Design explorations</span>
          </div>
        </div>
        <div className={s.variantTabs} role="group" aria-label="Design variant">
          {variants.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={variant === item.id}
              onClick={() => {
                setVariant(item.id);
                setConversation(item.id === "desk");
                window.history.replaceState(null, "", `?variant=${item.id}`);
              }}
            >
              <span>{item.number}</span>
              {item.name}
            </button>
          ))}
        </div>
        <div className={s.labTools}>
          <div
            className={s.deviceControls}
            role="group"
            aria-label="Preview viewport"
          >
            <button
              type="button"
              aria-label="Desktop preview"
              aria-pressed={!phone}
              onClick={() => setPhone(false)}
            >
              <Monitor size={17} />
            </button>
            <button
              type="button"
              aria-label="Phone preview"
              aria-pressed={phone}
              onClick={() => setPhone(true)}
            >
              <Smartphone size={17} />
            </button>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className={s.openPreview}
            aria-label="Open design in a new tab"
          >
            <ArrowUpRight size={18} />
          </a>
        </div>
      </header>
      <div className={s.labCaption}>
        <p>{active.description}</p>
        <button
          type="button"
          aria-pressed={conversation}
          onClick={() => setConversation(!conversation)}
        >
          {conversation ? "Show start screen" : "Show sample conversation"}
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className={s.previewStage} data-phone={phone}>
        <iframe
          className={s.previewFrame}
          src={src}
          title={`${active.name} AI Assistant design`}
        />
      </div>
      <footer className={s.labFooter}>
        <span>
          <i /> Development only · Fictional studio data
        </span>
        <span>Try a prompt, open a previous chat, or start a new one.</span>
      </footer>
    </main>
  );
}
