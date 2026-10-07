import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  palettes,
  type Language,
  type LocalizedText,
  type ThemeName,
} from "@/lib/theme";

const PREFERENCES_KEY = "opus-mobile-preferences-v1";
type StudioContextValue = {
  ready: boolean;
  language: Language;
  theme: ThemeName;
  setLanguage: (value: Language) => void;
  setTheme: (value: ThemeName) => void;
};
const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<ThemeName>("clarity");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PREFERENCES_KEY)
      .then((value) => {
        if (!active || !value) return;
        const saved = JSON.parse(value);
        if (saved.language === "en" || saved.language === "mk")
          setLanguage(saved.language);
        if (saved.theme === "clarity" || saved.theme === "studio")
          setTheme(saved.theme);
      })
      .catch(() => {
        /* Unavailable storage keeps the default appearance. */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready)
      void AsyncStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ language, theme }),
      ).catch(() => {});
  }, [language, theme, ready]);

  return (
    <StudioContext.Provider
      value={{
        ready,
        language,
        theme,
        setLanguage,
        setTheme,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) throw new Error("useStudio requires StudioProvider");
  const t = useCallback(
    (en: string, mk: string) => (context.language === "mk" ? mk : en),
    [context.language],
  );
  return {
    ...context,
    colors: palettes[context.theme],
    t,
    localize: (value: LocalizedText) => value[context.language],
    font:
      context.language === "mk" ? "Manrope_400Regular" : "DMSans_400Regular",
    mediumFont:
      context.language === "mk" ? "Manrope_500Medium" : "DMSans_500Medium",
    semiboldFont:
      context.language === "mk" ? "Manrope_600SemiBold" : "DMSans_600SemiBold",
  };
}
