export function initializeLanding() {
  const controller = new AbortController();
  const { signal } = controller;
  let observer;
  document.querySelectorAll(".faq-list details").forEach((details) =>
    details.addEventListener(
      "toggle",
      () => {
        if (details.open)
          document.querySelectorAll(".faq-list details").forEach((other) => {
            if (other !== details) other.open = false;
          });
      },
      { signal },
    ),
  );
  const studioCarousel = document.querySelector(".studio-carousel");
  if (studioCarousel) {
    const slides = [...studioCarousel.querySelectorAll(".studio-slide")];
    const studioNames = [
      "Hair salons",
      "Barbershops",
      "Nail studios",
      "Makeup artists",
      "Massage studios",
    ];
    let activeStudio = 0;
    function showStudio(index, moveFocus = false) {
      activeStudio = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const offset =
          ((i - activeStudio + slides.length + 2) % slides.length) - 2;
        slide.dataset.offset = String(offset);
        slide.setAttribute("aria-pressed", String(offset === 0));
        slide.tabIndex = offset === 0 ? 0 : -1;
        slide
          .querySelector(".studio-slide-copy")
          .setAttribute("aria-hidden", String(offset !== 0));
      });
      studioCarousel.querySelector(".studio-carousel-count b").textContent =
        String(activeStudio + 1).padStart(2, "0");
      studioCarousel.querySelector(".studio-carousel-status").textContent =
        studioNames[activeStudio] +
        ", " +
        (activeStudio + 1) +
        " of " +
        slides.length;
      if (moveFocus) slides[activeStudio].focus({ preventScroll: true });
    }
    studioCarousel
      .querySelector(".studio-prev")
      .addEventListener("click", () => showStudio(activeStudio - 1), {
        signal,
      });
    studioCarousel
      .querySelector(".studio-next")
      .addEventListener("click", () => showStudio(activeStudio + 1), {
        signal,
      });
    let suppressSlideClick = false;
    slides.forEach((slide, i) =>
      slide.addEventListener(
        "click",
        () => {
          if (!suppressSlideClick) showStudio(i, true);
        },
        { signal },
      ),
    );
    studioCarousel.addEventListener(
      "keydown",
      (event) => {
        suppressSlideClick = false;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          showStudio(
            activeStudio - 1,
            event.target.classList.contains("studio-slide"),
          );
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          showStudio(
            activeStudio + 1,
            event.target.classList.contains("studio-slide"),
          );
        }
        if (event.key === "Home") {
          event.preventDefault();
          showStudio(0, event.target.classList.contains("studio-slide"));
        }
        if (event.key === "End") {
          event.preventDefault();
          showStudio(
            slides.length - 1,
            event.target.classList.contains("studio-slide"),
          );
        }
      },
      { signal },
    );
    const stage = studioCarousel.querySelector(".studio-carousel-stage");
    let swipeStart = null;
    stage.addEventListener(
      "pointerdown",
      (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        suppressSlideClick = false;
        swipeStart = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        };
      },
      { signal },
    );
    stage.addEventListener(
      "pointermove",
      (event) => {
        if (!swipeStart || swipeStart.id !== event.pointerId) return;
        const dx = event.clientX - swipeStart.x,
          dy = event.clientY - swipeStart.y;
        if (
          Math.abs(dx) > 12 &&
          Math.abs(dx) > Math.abs(dy) * 1.3 &&
          !stage.hasPointerCapture(event.pointerId)
        )
          stage.setPointerCapture(event.pointerId);
      },
      { signal },
    );
    stage.addEventListener(
      "pointerup",
      (event) => {
        if (!swipeStart || swipeStart.id !== event.pointerId) return;
        const dx = event.clientX - swipeStart.x,
          dy = event.clientY - swipeStart.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          suppressSlideClick = true;
          showStudio(activeStudio + (dx < 0 ? 1 : -1));
        }
        swipeStart = null;
        if (stage.hasPointerCapture(event.pointerId))
          stage.releasePointerCapture(event.pointerId);
      },
      { signal },
    );
    stage.addEventListener(
      "pointercancel",
      () => {
        swipeStart = null;
      },
      { signal },
    );
    showStudio(0);
  }
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("js-motion");
    observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.06, rootMargin: "0px 0px -25px 0px" },
    );
    document
      .querySelectorAll(".reveal")
      .forEach((element) => observer.observe(element));
  }
  return () => {
    controller.abort();
    observer?.disconnect();
    document.documentElement.classList.remove("js-motion");
  };
}
