"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  setClientLocale,
  type Locale,
} from "./locale";
import { getMessages, type Messages } from "./messages";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
  t: Messages;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [prevInitial, setPrevInitial] = useState<Locale>(initialLocale);

  // Sync state if the initialLocale prop changes from server revalidation
  if (initialLocale !== prevInitial) {
    setPrevInitial(initialLocale);
    setLocaleState(initialLocale);
  }

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState((prev) => {
        if (prev === newLocale) return prev;
        setClientLocale(newLocale);
        if (typeof document !== "undefined") {
          document.documentElement.lang = newLocale;
        }
        router.refresh();
        return newLocale;
      });
    },
    [router],
  );

  const messages = useMemo(() => getMessages(locale), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      messages,
      t: messages,
    }),
    [locale, messages, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
