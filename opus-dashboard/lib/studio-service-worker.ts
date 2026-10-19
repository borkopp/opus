/** Keep the existing worker URL and scope so installed push subscriptions survive. */
export function studioServiceWorkerSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator
  );
}

export async function registerStudioServiceWorker() {
  if (!studioServiceWorkerSupported()) return null;
  return navigator.serviceWorker.register("/opus-push-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}
