import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";

const url = process.env.CONVEX_URL;
if (!url) throw new Error("CONVEX_URL not set in .env");

export const convex = new ConvexHttpClient(url);

export const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "";
if (!ADMIN_KEY) throw new Error("ADMIN_API_KEY not set in .env");

export { api };
