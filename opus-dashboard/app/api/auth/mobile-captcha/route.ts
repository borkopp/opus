import { authSecurityPolicy } from "@/lib/auth-proxy";
import { mobileWebOrigins } from "@/lib/mobile-auth-cors";

// Serve the challenge on the proxy's hostname: server-side Turnstile verification
// deliberately rejects tokens solved on a different hostname.
export function GET(request: Request) {
  const { siteKey } = authSecurityPolicy(request);
  if (!siteKey)
    return new Response("Security check is unavailable.", { status: 503 });
  const requestedOrigin = new URL(request.url).searchParams.get("origin");
  const target =
    requestedOrigin && mobileWebOrigins().includes(requestedOrigin)
      ? requestedOrigin
      : null;
  const json = (value: unknown) =>
    JSON.stringify(value).replace(/</g, "\\u003c");
  const nonce = crypto.randomUUID();
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#fff"><div id="challenge"></div><script nonce="${nonce}">
  function send(token,error){const data={type:"opus-auth-captcha",token,error};
  if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(data));
  const target=${json(target)};if(target)window.parent.postMessage(data,target);}
  window.ready=function(){turnstile.render('#challenge',{sitekey:${json(siteKey)},action:'auth-otp',size:'flexible',callback:function(token){send(token,false)},'expired-callback':function(){send(null,false)},'error-callback':function(){send(null,true)}})};
  </script><script nonce="${nonce}" src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=ready&render=explicit" async defer></script></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src https://challenges.cloudflare.com; style-src 'unsafe-inline'; frame-ancestors 'self' ${mobileWebOrigins().join(" ")}`,
    },
  });
}
