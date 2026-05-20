// Scrapes full menus from Wolt restaurant pages using Playwright.
// Reads existing wolt-places.json, fills in menuText for venues missing it.
//
// Usage:  npm run scrape:wolt:menus
// Time:   ~8-12s per venue (includes scroll + load wait).

import "dotenv/config";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";
import { chromium } from "playwright";
import type { WoltPlace } from "./scrape-wolt.js";

const DATA_PATH = path.resolve("data/wolt-places.json");
const CONCURRENCY = 5;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Scroll the page from top to bottom to trigger lazy-loaded items.
async function autoScroll(page: import("playwright").Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let scrolled = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        scrolled += step;
        if (scrolled >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 120);
    });
  });
}

async function extractMenuFromPage(
  page: import("playwright").Page,
): Promise<string | null> {
  try {
    await page.waitForSelector('[data-test-id="MenuSection"]', {
      timeout: 12000,
    });
  } catch {
    return null;
  }

  // Scroll so Wolt lazy-loads item cards inside each section, then wait for render.
  await autoScroll(page);
  await page.waitForTimeout(900);

  const menuText = await page.evaluate((): string | null => {
    const lines: string[] = [];

    const sections = Array.from(
      document.querySelectorAll('[data-test-id="MenuSection"]'),
    );
    if (sections.length === 0) return null;

    for (const section of sections) {
      // ── Section title ──────────────────────────────────────────────────────
      const titleEl = section.querySelector("h2, h3");
      const title = titleEl?.textContent?.trim();
      if (title) lines.push(`\n## ${title}`);

      // ── Items: try specific data-test-id first ─────────────────────────────
      let items = Array.from(
        section.querySelectorAll('[data-test-id="MenuItem"]'),
      );

      // ── Items: try class-name patterns ─────────────────────────────────────
      if (items.length === 0) {
        items = Array.from(
          section.querySelectorAll(
            '[class*="MenuItem"], [class*="menu-item"], [class*="menuItem"]',
          ),
        );
      }

      // ── Items: li / role=listitem ──────────────────────────────────────────
      if (items.length === 0) {
        items = Array.from(section.querySelectorAll("li, [role='listitem']"));
      }

      if (items.length > 0) {
        for (const item of items) {
          const nameEl = item.querySelector(
            'h3, h4, h5, [class*="name"], [class*="Name"], [class*="title"], [class*="Title"]',
          );
          const priceEl = item.querySelector(
            '[class*="price"], [class*="Price"]',
          );
          const descEl = item.querySelector(
            '[class*="description"], [class*="Description"], [class*="desc"], [class*="Desc"]',
          );

          const name = nameEl?.textContent?.trim() ?? "";
          if (!name || name.length > 120) continue;
          const price = priceEl?.textContent?.trim() ?? "";
          const desc = descEl?.textContent?.trim() ?? "";
          lines.push(
            `- ${name}${price ? " (" + price + ")" : ""}${desc ? " — " + desc.slice(0, 100) : ""}`,
          );
        }
      } else {
        // ── Fallback: extract all leaf-ish text nodes inside this section ────
        // Skip the header element itself; grab every span/p/div that has text
        // but no significant child containers (to avoid repeating parent text).
        const seen = new Set<string>();
        const candidates = Array.from(
          section.querySelectorAll("span, p, div, a"),
        );
        for (const el of candidates) {
          if (el === titleEl || titleEl?.contains(el)) continue;
          // Only leaf-ish: no more than 2 child elements that themselves have text
          const textChildren = Array.from(el.children).filter(
            (c) => (c.textContent?.trim().length ?? 0) > 0,
          );
          if (textChildren.length > 2) continue;

          const text = el.textContent?.trim().replace(/\s+/g, " ") ?? "";
          if (!text || text.length < 3 || text.length > 150) continue;
          if (seen.has(text)) continue;
          seen.add(text);
          lines.push(`- ${text}`);
        }
      }
    }

    const meaningful = lines.filter((l) => l.trim());
    return meaningful.length > 2 ? meaningful.join("\n").trim() : null;
  });

  return menuText;
}

async function processVenue(
  page: import("playwright").Page,
  place: WoltPlace,
): Promise<string | null> {
  const url = `https://wolt.com/mk/mkd/skopje/restaurant/${place.woltSlug}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    try {
      await page.click(
        '[data-test-id="modal-close-button"], [aria-label="Close"]',
        {
          timeout: 2000,
        },
      );
    } catch {
      /* no popup */
    }

    return await extractMenuFromPage(page);
  } catch {
    return null;
  }
}

async function main() {
  if (!existsSync(DATA_PATH)) {
    console.error(
      "data/wolt-places.json not found. Run npm run scrape:wolt first.",
    );
    process.exit(1);
  }

  const places: WoltPlace[] = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const toProcess = places.filter((p) => !p.menuText);
  console.log(
    `${toProcess.length} venues missing menus (${places.length} total).`,
  );
  if (toProcess.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const pages = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => browser.newPage()),
  );
  for (const pg of pages) {
    await pg.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf}", (route) =>
      route.abort(),
    );
  }

  const results = new Map(places.map((p) => [p.woltSlug, p]));
  let done = 0;
  let found = 0;

  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((place, idx) => processVenue(pages[idx], place)),
    );

    for (let j = 0; j < batch.length; j++) {
      const place = batch[j];
      const menu = batchResults[j];
      results.set(place.woltSlug, {
        ...results.get(place.woltSlug)!,
        menuText: menu,
      });
      done++;
      if (menu) found++;
      process.stdout.write(
        `\r  ${done}/${toProcess.length} processed — ${found} menus found`,
      );
    }

    if (done % 30 === 0) {
      writeFileSync(DATA_PATH, JSON.stringify([...results.values()], null, 2));
    }

    await sleep(300);
  }

  await browser.close();

  writeFileSync(DATA_PATH, JSON.stringify([...results.values()], null, 2));

  const withMenu = [...results.values()].filter((p) => p.menuText).length;
  console.log(
    `\n\nDone. ${withMenu}/${places.length} venues now have menu text.`,
  );
  console.log("Next: npm run upsert  (to push menuText into Convex)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
