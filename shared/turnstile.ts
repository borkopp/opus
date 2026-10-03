import { AUTH_CAPTCHA_ACTION } from "./auth-security";

type Turnstile = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      size: "flexible";
      theme: "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
};

export function mountAuthCaptcha(
  element: HTMLElement,
  siteKey: string,
  onToken: (token: string | null) => void,
  onError: () => void,
) {
  const turnstile = (window as typeof window & { turnstile?: Turnstile })
    .turnstile;
  if (!turnstile) {
    onError();
    return;
  }
  try {
    const id = turnstile.render(element, {
      sitekey: siteKey,
      action: AUTH_CAPTCHA_ACTION,
      size: "flexible",
      theme: "auto",
      callback: onToken,
      "expired-callback": () => onToken(null),
      "error-callback": () => {
        onToken(null);
        onError();
      },
    });
    return () => turnstile.remove(id);
  } catch {
    onError();
  }
}
