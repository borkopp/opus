// Removes openingHours from all scraped orgs.
//
// Usage:  npm run clear:hours

import "dotenv/config";
import { convex, ADMIN_KEY, api } from "./lib/convex.js";

async function main() {
  console.log("Clearing opening hours from all scraped orgs…");
  const { cleared } = await convex.mutation(api.marketplace.scraped.clearAllHours, {
    adminKey: ADMIN_KEY,
  });
  console.log(`Done. Cleared hours from ${cleared} org${cleared !== 1 ? "s" : ""}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
