export function initializeLanding() {
  const controller = new AbortController();
  const { signal } = controller;
  let observer;
  const serviceNames = ["Cut & blow-dry", "Color & care", "A little refresh"];
  let selectedService = 0;
  const panel = document.querySelector("#tour-panel");
  const tourTemplates = {
    website: () =>
      `<div class="tour-studio-header"><span class="atelier-logo">ATELIER</span><div class="tour-studio-nav"><b>Book a moment</b><span>Our studio</span><span>Skopje, MK</span></div></div><div class="tour-studio-main"><div class="tour-studio-photo"><img src="/assets/studio.jpg" alt="Atelier sample studio interior" width="1536" height="1024"><div class="photo-overlay"><h3>Good hair.<br>Even better energy.</h3></div></div><div class="service-picker"><h3>What feels like you today?</h3><p>Choose a service. We’ll save you a seat.</p><div id="booking-demo-controls">${renderServices()}</div></div></div>`,
    calendar: () =>
      `<div class="tour-calendar"><div class="tour-dashboard-heading"><div><h3>A good day, all in view.</h3><p>Sample calendar · Thursday, 17 September</p></div><span>3 team members</span></div><div class="full-calendar"><div class="time-column"><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span><span>13:00</span></div><div class="day-column"><div class="staff">Ana</div><div class="appointment apt-blue"><b>Cut &amp; blow-dry</b><span>09:00 · Elena P.</span></div><div class="appointment apt-cream"><b>Color &amp; care</b><span>10:30 · Mila S.</span></div><div class="appointment apt-green"><b>Hair treatment</b><span>12:00 · Nina A.</span></div></div><div class="day-column"><div class="staff">Marija</div><div class="appointment apt-purple"><b>Gel manicure</b><span>09:30 · Sara K.</span></div><div class="appointment apt-green"><b>Classic manicure</b><span>11:00 · Eva M.</span></div></div><div class="day-column"><div class="staff">Elena</div><div class="appointment apt-cream"><b>Makeup session</b><span>09:00 · Jana M.</span></div><div class="appointment apt-blue" style="margin-top:39px"><b>Event makeup</b><span>11:00 · Tea S.</span></div></div></div><p class="calendar-demo-footnote">✧ One shared view for your team’s appointments, breaks, and availability.</p></div>`,
    clients: () =>
      `<div class="client-demo"><div class="tour-dashboard-heading"><div><h3>Every client, remembered.</h3><p>Sample clients · A little context makes all the difference.</p></div><span>Your studio’s people</span></div><table class="client-table"><thead><tr><th>CLIENT</th><th>LAST VISIT</th><th>SERVICE</th><th>VISITS</th></tr></thead><tbody><tr><td><span class="avatar-letter">EP</span>Elena Petrova</td><td>14 Sep 2026</td><td>Cut &amp; blow-dry</td><td>8 visits</td></tr><tr><td><span class="avatar-letter">MS</span>Mila Stojanova</td><td>12 Sep 2026</td><td>Color &amp; care</td><td>5 visits</td></tr><tr><td><span class="avatar-letter">SK</span>Sara Kostova</td><td>11 Sep 2026</td><td>Gel manicure</td><td>12 visits</td></tr><tr><td><span class="avatar-letter">EM</span>Eva Mitreva</td><td>9 Sep 2026</td><td>Classic manicure</td><td>3 visits</td></tr></tbody></table><p class="calendar-demo-footnote">Client contact details and visit history, together in one place. Included in Free.</p></div>`,
  };
  function renderServices() {
    return (
      serviceNames
        .map(
          (name, i) =>
            `<button class="service-option" data-service="${i}" aria-pressed="${i === selectedService}"><span><b>${name}</b><small>${["60 min · from 900 MKD", "90 min · from 1,800 MKD", "30 min · from 500 MKD"][i]}</small></span><i>${i === selectedService ? "✓" : "+"}</i></button>`,
        )
        .join("") +
      '<button class="demo-book" data-booking-next>Choose a time <span>↗</span></button>'
    );
  }
  const tourTabs = [...document.querySelectorAll("[data-tour]")];
  function activateTour(tab, focus = false) {
    const key = tab.dataset.tour;
    tourTabs.forEach((t) => {
      t.setAttribute("aria-selected", String(t === tab));
      t.tabIndex = t === tab ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", tab.id);
    panel.innerHTML = tourTemplates[key]();
    document.querySelector("#tour-address").textContent =
      key === "website" ? "atelier.opus.mk" : "studio.opus.mk";
    if (focus) tab.focus();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      panel.animate(
        [
          { opacity: 0.35, transform: "translateY(4px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 220, easing: "ease-out" },
      );
  }
  tourTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTour(tab), { signal });
    tab.addEventListener(
      "keydown",
      (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % tourTabs.length;
        if (event.key === "ArrowLeft")
          next = (index + tourTabs.length - 1) % tourTabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tourTabs.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          activateTour(tourTabs[next], true);
        }
      },
      { signal },
    );
  });
  activateTour(tourTabs[0]);
  panel.addEventListener(
    "click",
    (event) => {
      const service = event.target.closest("[data-service]");
      if (service) {
        selectedService = Number(service.dataset.service);
        panel.querySelectorAll("[data-service]").forEach((button) => {
          const selected = Number(button.dataset.service) === selectedService;
          button.setAttribute("aria-pressed", String(selected));
          button.querySelector("i").textContent = selected ? "✓" : "+";
        });
      }
      if (event.target.closest("[data-booking-next]")) {
        document.querySelector("#booking-demo-controls").innerHTML =
          `<p style="font-size:12px;color:#74846d;margin:14px 0">${serviceNames[selectedService]} · Friday, 18 September</p><div class="time-select">${["09:00", "10:30", "11:30", "13:00", "14:30", "16:00"].map((time) => `<button data-time="${time}">${time}</button>`).join("")}</div><p style="font-size:10px;margin-top:13px;color:#9aa794">Choose a sample time to try the flow.</p><button class="demo-back" data-booking-back>← Back to services</button>`;
        document.querySelector("[data-time]").focus();
      }
      const time = event.target.closest("[data-time]");
      if (time) {
        document.querySelector("#booking-demo-controls").innerHTML =
          `<div class="demo-notice" role="status"><b>That’s how easy booking can feel.</b><br>${serviceNames[selectedService]} · Friday at ${time.dataset.time}.<br><br>This is a preview. No appointment has been booked.</div><a class="demo-book" href="https://studio.opus.mk/signup">Create your own booking website <span>↗</span></a><button class="demo-back" data-booking-back>← Try another service</button>`;
        document.querySelector(".demo-book").focus();
      }
      if (event.target.closest("[data-booking-back]")) {
        document.querySelector("#booking-demo-controls").innerHTML =
          renderServices();
        document.querySelector("[data-service]").focus();
      }
    },
    { signal },
  );
  const answers = {
    busy: {
      question: "When is my studio busiest?",
      answer:
        "In this sample week, Friday is your busiest day. Tuesday has the most space for new appointments.",
      values: [48, 30, 65, 56, 92, 76],
      highlight: 4,
    },
    cancel: {
      question: "What do my cancellation patterns look like?",
      answer:
        "In this sample, Tuesday has the most cancellations. Look at how far in advance clients cancel to plan your follow-up.",
      values: [25, 83, 39, 19, 48, 30],
      highlight: 1,
    },
    grow: {
      question: "Where does my studio have room to grow?",
      answer:
        "This sample shows the most available time on Monday and Tuesday. Consider testing a relevant rebooking offer for past clients.",
      values: [70, 86, 43, 55, 20, 29],
      highlight: 1,
    },
  };
  document.querySelectorAll("[data-question]").forEach((button) =>
    button.addEventListener(
      "click",
      () => {
        const data = answers[button.dataset.question];
        document.querySelector("#analyst-question").textContent = data.question;
        document.querySelector("#analyst-answer").textContent = data.answer;
        document.querySelectorAll("#analyst-chart>div").forEach((bar, i) => {
          bar
            .querySelector("i")
            .style.setProperty("--bar", data.values[i] + "%");
          bar.classList.toggle("highlight-bar", i === data.highlight);
        });
        document
          .querySelector("#analyst-chart")
          .setAttribute(
            "aria-label",
            "Illustrative sample chart for: " + data.question,
          );
        document.querySelectorAll("[data-question]").forEach((b) => {
          b.classList.toggle("selected", b === button);
          b.setAttribute("aria-pressed", String(b === button));
        });
      },
      { signal },
    ),
  );
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
