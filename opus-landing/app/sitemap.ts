import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pricing", "/contact", "/privacy", "/terms"].map((path) => ({
    url: `https://opus.mk${path}`,
    changeFrequency: path ? "monthly" : "weekly",
    priority: path ? 0.4 : 1,
  }));
}
