"use client";

import { useEffect, useCallback } from "react";
import { EditorAction } from "./types";

export function useEditorShortcuts(
  dispatch: React.Dispatch<EditorAction>,
  selectedIds: string[],
  isSpaceHeld: React.MutableRefObject<boolean>,
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Space for pan mode
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        isSpaceHeld.current = true;
        return;
      }

      // Don't capture shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd+Z — Undo
      if (isMeta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }

      // Cmd+A — Select all
      if (isMeta && e.key === "a") {
        e.preventDefault();
        dispatch({ type: "SELECT_TABLES", ids: [] }); // handled by parent with all IDs
        return;
      }

      // Cmd+D — Duplicate
      if (isMeta && e.key === "d") {
        e.preventDefault();
        dispatch({ type: "PUSH_UNDO" });
        dispatch({ type: "DUPLICATE_SELECTED" });
        return;
      }

      // Delete or Backspace — Delete selected
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        dispatch({ type: "PUSH_UNDO" });
        dispatch({ type: "DELETE_TABLES", ids: selectedIds });
        return;
      }

      // Escape — Deselect
      if (e.key === "Escape") {
        e.preventDefault();
        dispatch({ type: "DESELECT_ALL" });
        dispatch({ type: "SET_MODE", mode: "select" });
        return;
      }
    },
    [dispatch, selectedIds, isSpaceHeld],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceHeld.current = false;
      }
    },
    [isSpaceHeld],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
