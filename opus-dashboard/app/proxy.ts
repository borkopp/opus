import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../convex/_generated/api";

const platformDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "omniservice.app";

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const hostname = request.headers.get("host") || "";

    if (
        hostname === platformDomain ||
        hostname === `app.${platformDomain}` ||
        hostname === `www.${platformDomain}` ||
        hostname.startsWith("localhost:")
    ) {
        // Pass through core platform routes without rewriting
        return NextResponse.next();
    }

    let orgId: string | null = null;
    const isSubdomain = hostname.endsWith(`.${platformDomain}`);

    if (isSubdomain) {
        const slug = hostname.replace(`.${platformDomain}`, "");
        const orgIdResult = await fetchQuery(api.orgs.getBySlug, { slug });
        if (orgIdResult) {
            orgId = orgIdResult;
        }
    } else {
        const orgIdResult = await fetchQuery(api.orgs.getByCustomDomain, { customDomain: hostname });
        if (orgIdResult) {
            orgId = orgIdResult;
        }
    }

    if (!orgId) {
        // Return 404 rewrite if no org matches
        url.pathname = "/404";
        return NextResponse.rewrite(url);
    }

    // Rewrite internal path to /sites/[orgId]/[...rest]
    url.pathname = `/sites/${orgId}${url.pathname}`;
    return NextResponse.rewrite(url);
}
