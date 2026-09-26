import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import ts from "typescript";

// Compile the real shared policy for injection into the browser. Reading the
// source avoids Node's ESM loader boundary outside this app's package root.
const maskingSource = ts.transpileModule(
  readFileSync(resolve("../shared/analytics/replay-masking.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

test("replay preserves interface copy while masking private text and later updates", async ({
  page,
}) => {
  await page.setContent(`
    <h1 data-replay-public>Studio setup</h1>
    <button data-replay-public>Објави веб-страница</button>
    <p id="client">Private Client Alpha</p>
    <div data-replay-public>Service <span>Private Treatment Beta</span></div>
    <section data-replay-private><span data-replay-public>Private Note Gamma</span></section>
    <div class="ph-mask"><span data-replay-public>Private Phone Delta</span></div>
    <div contenteditable="true"><span data-replay-public>Private Draft Epsilon</span></div>
    <p data-replay-public="false">Private Address Zeta</p>
    <input data-replay-public value="private@example.com">
    <textarea data-replay-public>Private Message Eta</textarea>
  `);
  await page.addScriptTag({
    content: readFileSync(
      resolve("node_modules/posthog-js/dist/recorder.js"),
      "utf8",
    ),
  });
  await page.evaluate((maskingModule) => {
    const recorderWindow = window as unknown as {
      rrweb: { record: (options: Record<string, unknown>) => () => void };
      replayEvents: unknown[];
    };
    recorderWindow.replayEvents = [];
    recorderWindow.rrweb.record({
      emit: (event: unknown) => recorderWindow.replayEvents.push(event),
      maskAllInputs: true,
      maskTextSelector: "*",
      maskTextFn: new Function(
        `const exports = {}; ${maskingModule}; return exports.maskReplayText;`,
      )(),
    });
  }, maskingSource);

  const events = () =>
    page.evaluate(() =>
      JSON.stringify(
        (window as unknown as { replayEvents: unknown[] }).replayEvents,
      ),
    );
  await expect.poll(events).toContain("Studio setup");
  expect(await events()).toContain("Објави веб-страница");
  expect(await events()).not.toMatch(/Private |private@example/);

  await page.evaluate(() => {
    document.querySelector("#client")!.textContent = "Private Updated Theta";
    document.querySelector("h1")!.textContent = "Bookable hours";
    const note = document.createElement("p");
    note.textContent = "Private Added Iota";
    document.body.appendChild(note);
    const input = document.querySelector("input")!;
    input.value = "private-updated@example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(events).toContain("Bookable hours");
  expect(await events()).not.toMatch(/Private |private-updated@example/);
});
