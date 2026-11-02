/** Progressive enhancement: content remains visible if JS or motion is unavailable. */
export function initializeLandingMotion() {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  const { signal } = controller;
  const animations = new Map<Element, Animation>();
  const elements = document.querySelectorAll<HTMLElement>(".reveal");
  let observer: IntersectionObserver | undefined;

  const finish = (element: Element) => {
    animations.get(element)?.cancel();
    animations.delete(element);
    observer?.unobserve(element);
    (element as HTMLElement).dataset.motionSeen = "true";
  };

  document.addEventListener(
    "keydown",
    () => {
      document.documentElement.dataset.landingInput = "keyboard";
      animations.forEach((_animation, element) => finish(element));
    },
    { signal },
  );
  document.addEventListener(
    "pointerdown",
    () => {
      document.documentElement.dataset.landingInput = "pointer";
    },
    { signal, passive: true },
  );
  document.addEventListener(
    "focusin",
    (event) => {
      if (!(event.target instanceof Element)) return;
      // Focus must never wait for a decorative entrance, including nested content.
      let element = event.target.closest(".reveal");
      while (element) {
        finish(element);
        element = element.parentElement?.closest(".reveal") ?? null;
      }
    },
    { signal },
  );

  const stop = () => {
    observer?.disconnect();
    animations.forEach((_animation, element) => finish(element));
  };
  preference.addEventListener(
    "change",
    () => {
      if (preference.matches) stop();
    },
    { signal },
  );

  if (!preference.matches && "IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        let stagger = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer?.unobserve(element);
          if (element.dataset.motionSeen) continue;
          element.dataset.motionSeen = "true";
          if (
            preference.matches ||
            document.documentElement.dataset.landingInput === "keyboard" ||
            element.contains(document.activeElement) ||
            entry.boundingClientRect.top < 0
          )
            continue;

          const distance = window.matchMedia("(max-width: 760px)").matches
            ? 12
            : 20;
          const animation = element.animate(
            [
              { opacity: 0, transform: `translateY(${distance}px)` },
              { opacity: 1, transform: "none" },
            ],
            {
              duration: 560,
              delay: Math.min(stagger++ * 55, 165),
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "backwards",
            },
          );
          animations.set(element, animation);
          animation.onfinish = () => animations.delete(element);
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -24px 0px" },
    );
    elements.forEach((element) => observer?.observe(element));
  }

  return () => {
    stop();
    controller.abort();
    delete document.documentElement.dataset.landingInput;
  };
}
