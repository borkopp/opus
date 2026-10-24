import assert from "node:assert/strict";

const base = (process.argv[2] || "http://localhost:3101").replace(/\/$/, "");
const canonicalBase = "https://opus.mk";
const pages = ["/", "/pricing", "/contact", "/privacy", "/terms"];
const locales = ["mk", "en", "sq"];
const pathFor = (page, locale) =>
  locale === "mk" ? page : `/${locale}${page === "/" ? "" : page}`;
const attributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [
      match[1].toLowerCase(),
      match[2],
    ]),
  );
const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map(([tag]) =>
    attributes(tag),
  );
const bot = {
  "user-agent": "Twitterbot/1.0",
  "accept-language": "en-US",
  cookie: "opus_locale=sq",
  "x-opus-locale": "sq",
};

for (const locale of locales) {
  for (const page of pages) {
    const path = pathFor(page, locale);
    const response = await fetch(base + path, {
      headers: bot,
      redirect: "manual",
    });
    assert.equal(response.status, 200, `${path} must render directly`);
    assert.ok(!response.headers.get("x-robots-tag")?.includes("noindex"), path);
    const html = await response.text();
    const head = html.split("</head>")[0];
    const links = tags(head, "link");
    const meta = tags(head, "meta");
    const value = (name) =>
      meta.find((tag) => tag.name === name || tag.property === name)?.content;
    const title = head.match(/<title>(.*?)<\/title>/)?.[1];
    assert.equal(
      tags(html, "html")[0].lang,
      locale,
      `${path}: URL must beat cookies and headers`,
    );
    assert.equal(
      (html.match(/<h1\b/g) || []).length,
      1,
      `${path}: one primary heading`,
    );
    assert.ok(title && title.includes("OPUS"), `${path}: title`);
    assert.ok(value("description")?.length > 40, `${path}: description`);
    assert.equal(
      links.filter((tag) => tag.rel === "canonical").length,
      1,
      path,
    );
    assert.equal(
      new URL(links.find((tag) => tag.rel === "canonical").href).href,
      canonicalBase + path,
      path,
    );
    for (const alternative of locales) {
      assert.equal(
        new URL(links.find((tag) => tag.hreflang === alternative)?.href).href,
        canonicalBase + pathFor(page, alternative),
        path,
      );
    }
    assert.equal(
      new URL(links.find((tag) => tag.hreflang === "x-default")?.href).href,
      canonicalBase + page,
      path,
    );
    assert.equal(new URL(value("og:url")).href, canonicalBase + path, path);
    assert.equal(value("og:title"), title, path);
    assert.equal(value("twitter:title"), title, path);
    assert.equal(
      value("og:image"),
      canonicalBase + "/assets/opus-social-preview.jpg",
      path,
    );
    assert.equal(value("og:image:width"), "1200", path);
    assert.equal(value("og:image:height"), "630", path);
    assert.equal(value("twitter:card"), "summary_large_image", path);
    assert.ok(
      value("robots")?.includes("index, follow") &&
        !value("robots").includes("noindex"),
      path,
    );
    const anchors = tags(html, "a");
    assert.ok(
      anchors.some((tag) => tag.href === pathFor("/pricing", locale)),
      `${path}: localized navigation`,
    );
    if (page === "/") {
      const json = html.match(
        /<script type="application\/ld\+json">(.*?)<\/script>/s,
      )?.[1];
      const graph = JSON.parse(json)["@graph"];
      assert.deepEqual(
        graph.map((entity) => entity["@type"]),
        ["Organization", "WebSite", "WebPage"],
      );
      assert.equal(graph.at(-1).inLanguage, locale);
      assert.equal(graph.at(-1).url, canonicalBase + path);
      assert.ok(
        !json.includes("aggregateRating"),
        "Do not invent review ratings",
      );
    }
    console.log(`PASS ${path}`);
  }
}
const sitemap = await (await fetch(base + "/sitemap.xml")).text();
assert.equal((sitemap.match(/<url>/g) || []).length, 15);
assert.equal((sitemap.match(/hreflang=/g) || []).length, 60);
for (const locale of locales)
  for (const page of pages)
    assert.ok(
      sitemap.includes(`<loc>${canonicalBase}${pathFor(page, locale)}</loc>`),
    );
const robots = await (await fetch(base + "/robots.txt")).text();
assert.ok(robots.includes("Sitemap: https://opus.mk/sitemap.xml"));
assert.ok(!robots.includes("Disallow: /\n"));
for (const path of [
  "/assets/opus-social-preview.jpg",
  "/favicon-48.png",
  "/apple-touch-icon.png",
  "/opus-seo-logo.png",
]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  assert.ok(response.headers.get("content-type").startsWith("image/"), path);
}
for (const path of ["/mk", "/mk/pricing"]) {
  const response = await fetch(base + path + "?utm_source=check", {
    redirect: "manual",
  });
  assert.equal(response.status, 308, path);
  const location = new URL(response.headers.get("location"), base);
  assert.equal(location.pathname, path === "/mk" ? "/" : "/pricing");
  assert.equal(location.search, "?utm_source=check");
}
for (const path of [
  "/en/does-not-exist",
  "/sq/does-not-exist",
  "/does-not-exist",
]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 404, path);
}
console.log("PASS sitemap, robots, social/icon assets, redirects and 404s");
