// Lucide SVG geometry (ISC license), matching the React icons in the page.
// These static strings are for the existing HTML-based booking demo.
const svg = (paths) =>
  `<svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths.map((d) => `<path d="${d}"/>`).join("")}</svg>`;

export const demoIcons = {
  check: svg(["M20 6 9 17l-5-5"]),
  plus: svg(["M5 12h14", "M12 5v14"]),
  arrowUpRight: svg(["M7 7h10v10", "M7 17 17 7"]),
  arrowLeft: svg(["m12 19-7-7 7-7", "M19 12H5"]),
  sparkle: svg([
    "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
  ]),
};
