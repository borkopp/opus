/**
 * Only the marked element's own interface copy is public. The marker deliberately
 * does not apply to descendants: a button/card can contain a private name or note.
 * Never mark an element that renders user-entered or database-sourced text.
 */
export function maskReplayText(text: string, element?: HTMLElement): string {
  if (
    element?.hasAttribute("data-replay-public") &&
    element.getAttribute("data-replay-public") !== "false" &&
    !element.closest(
      '.ph-mask, .ph-no-capture, [data-replay-private], input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    )
  ) {
    return text;
  }

  return text.replace(/\S/g, "*");
}
