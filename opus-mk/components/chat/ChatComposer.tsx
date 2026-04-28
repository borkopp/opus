"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { IconSend, IconSparkles } from "@tabler/icons-react";
import { Sparkle, Sparkles } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const hasValue = value.trim().length > 0;

  return (
    <div
      className="flex items-end gap-2 rounded-[18px] px-4 py-2 transition-colors duration-200"
      style={{
        background: "rgba(20,20,18,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${focused ? "rgba(225,99,73,0.5)" : "rgba(255,255,255,0.12)"}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <Sparkle
        size={18}
        className="shrink-0 mb-0.5 self-center"
        style={{ color: "rgba(244,160,122,0.8)" }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        placeholder={placeholder ?? "Ask anything — haircut now, spa tonight…"}
        rows={1}
        className="flex-1 resize-none self-center bg-transparent border-0 outline-none text-[15px] leading-snug disabled:opacity-50"
        style={{
          overflow: "hidden",
          color: "#fff",
          caretColor: "var(--accent)",
        }}
      />
      <button
        onClick={submit}
        disabled={disabled || !hasValue}
        aria-label="Send message"
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
        style={{
          background: hasValue ? "var(--accent)" : "rgba(255,255,255,0.08)",
          boxShadow: hasValue ? "0 2px 8px rgba(225,99,73,0.5)" : "none",
        }}
      >
        <IconSend size={15} className="" color={hasValue ? "#fff" : "rgba(255,255,255,0.3)"} />
      </button>
    </div>
  );
}
