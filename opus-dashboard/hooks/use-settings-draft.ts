"use client";

import { useState, type SetStateAction } from "react";
import { changedSettings, refreshSettingsDraft } from "@/lib/settings-form";

/** Live query updates refresh clean fields without discarding unsaved edits. */
export function useSettingsDraft<T extends object>(incoming: T) {
  const [snapshot, setSnapshot] = useState({
    saved: incoming,
    draft: incoming,
  });
  let current = snapshot;
  if (JSON.stringify(incoming) !== JSON.stringify(snapshot.saved)) {
    current = {
      saved: incoming,
      draft: refreshSettingsDraft(snapshot.draft, snapshot.saved, incoming),
    };
    setSnapshot(current);
  }
  const setDraft = (next: SetStateAction<T>) =>
    setSnapshot((previous) => ({
      ...previous,
      draft:
        typeof next === "function"
          ? (next as (value: T) => T)(previous.draft)
          : next,
    }));
  const changes = changedSettings(current.draft, current.saved);
  return {
    draft: current.draft,
    setDraft,
    changes,
    isDirty: Object.keys(changes).length > 0,
  };
}
