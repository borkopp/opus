import { View } from "react-native";
import { WebView } from "react-native-webview";
import { dashboardUrl } from "@/lib/auth-client";
export function Captcha({
  onToken,
  onError,
}: {
  onToken: (token: string | null) => void;
  onError: () => void;
}) {
  const challengeUrl = `${dashboardUrl}/api/auth/mobile-captcha`;
  const allowedMessageUrl = (url: string) => {
    try {
      const candidate = new URL(url);
      return candidate.origin === new URL(dashboardUrl).origin && candidate.pathname === "/api/auth/mobile-captcha";
    } catch { return false; }
  };
  return (
    <View style={{ height: 100, overflow: "hidden", borderRadius: 12 }}>
      <WebView
        source={{ uri: challengeUrl }}
        // Turnstile also uses local about: frames inside its challenge iframe.
        originWhitelist={[
          new URL(dashboardUrl).origin,
          "https://challenges.cloudflare.com",
          "about:blank",
          "about:srcdoc",
        ]}
        onShouldStartLoadWithRequest={(request) => !request.isTopFrame || allowedMessageUrl(request.url)}
        onMessage={(event) => {
          if (!allowedMessageUrl(event.nativeEvent.url) || event.nativeEvent.data.length > 4096) return;
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "opus-auth-captcha") {
              onToken(typeof data.token === "string" && data.token.length <= 2048 ? data.token : null);
              if (data.error) onError();
            }
          } catch {
            onError();
          }
        }}
        onError={onError}
        onHttpError={onError}
        scrollEnabled={false}
      />
    </View>
  );
}
