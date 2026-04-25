"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "opus_chat_session";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments where crypto.randomUUID is unavailable
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useSessionId(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = generateUUID();
        localStorage.setItem(STORAGE_KEY, id);
      }
      setSessionId(id);
    } catch {
      // localStorage may be blocked (private browsing on Safari)
      setSessionId(generateUUID());
    }
  }, []);

  return sessionId;
}
