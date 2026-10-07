import {
  mergeWebsiteTranslations,
  type WebsiteDesign,
} from "../../shared/website-design";

export interface WebsiteEditorState {
  present: WebsiteDesign;
  past: WebsiteDesign[];
  future: WebsiteDesign[];
  saved: WebsiteDesign;
  revision: number;
}
export type WebsiteEditorAction =
  | { type: "change"; design: WebsiteDesign }
  | { type: "undo" | "redo" }
  | { type: "saved"; design: WebsiteDesign; revision: number }
  | { type: "translations"; design: WebsiteDesign; revision: number };

export function websiteEditorReducer(
  state: WebsiteEditorState,
  action: WebsiteEditorAction,
): WebsiteEditorState {
  if (action.type === "change") {
    if (JSON.stringify(action.design) === JSON.stringify(state.present))
      return state;
    return {
      ...state,
      present: action.design,
      past: [...state.past.slice(-49), state.present],
      future: [],
    };
  }
  if (action.type === "undo" && state.past.length)
    return {
      ...state,
      present: state.past[state.past.length - 1],
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future],
    };
  if (action.type === "redo" && state.future.length)
    return {
      ...state,
      present: state.future[0],
      past: [...state.past, state.present],
      future: state.future.slice(1),
    };
  if (action.type === "saved")
    return { ...state, saved: action.design, revision: action.revision };
  if (action.type === "translations" && action.revision === state.revision) {
    let present = state.present;
    let saved = state.saved;
    for (const translation of action.design.translations) {
      const localMessages =
        present.translations.find(
          (entry) => entry.locale === translation.locale,
        )?.messages ?? [];
      const baselineMessages =
        saved.translations.find((entry) => entry.locale === translation.locale)
          ?.messages ?? [];
      const updates = translation.messages.filter((message) => {
        const local = localMessages.find((entry) => entry.key === message.key);
        const baseline = baselineMessages.find(
          (entry) => entry.key === message.key,
        );
        // A finishing job must not overwrite corrections typed since the last save.
        return !(
          local?.manual &&
          local.source === message.source &&
          (local.value !== baseline?.value || local.source !== baseline?.source)
        );
      });
      if (present.primaryLanguage === state.saved.primaryLanguage)
        present = mergeWebsiteTranslations(
          present,
          translation.locale,
          updates,
        );
      saved = mergeWebsiteTranslations(
        saved,
        translation.locale,
        translation.messages,
      );
    }
    if (
      JSON.stringify(present) === JSON.stringify(state.present) &&
      JSON.stringify(saved) === JSON.stringify(state.saved)
    )
      return state;
    return { ...state, present, saved };
  }
  return state;
}
