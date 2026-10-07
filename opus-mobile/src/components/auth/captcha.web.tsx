import { useEffect, useRef } from "react";
import { dashboardUrl } from "@/lib/auth-client";
export function Captcha({
  onToken,
  onError,
}: {
  onToken: (token: string | null) => void;
  onError: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.origin !== new URL(dashboardUrl).origin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== "opus-auth-captcha"
      )
        return;
      onToken(typeof event.data.token === "string" ? event.data.token : null);
      if (event.data.error) onError();
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onToken, onError]);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return (
    <iframe
      ref={frame}
      title="Security check"
      src={`${dashboardUrl}/api/auth/mobile-captcha?origin=${encodeURIComponent(origin)}`}
      style={{ border: 0, height: 100, width: "100%", borderRadius: 12 }}
    />
  );
}
