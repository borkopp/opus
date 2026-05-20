import "dotenv/config";
import { convex, ADMIN_KEY, api } from "./lib/convex.js";

async function main() {
  const result = await convex.mutation(api.marketplace.scraped.hardDeleteAllScraped, {
    adminKey: ADMIN_KEY,
  });
  console.log(`Deleted ${result.deleted} scraped orgs (+ their media and embeddings).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
