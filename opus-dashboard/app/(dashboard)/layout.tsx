"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/sidebar";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React, { useState } from "react";
import { useTheme } from "next-themes";
import { industryRoutes, getNavLinks } from "@/lib/vertical-nav-config";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClerk } from "@clerk/nextjs";
import { IconLogout, IconSettings, IconUser } from "@tabler/icons-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, user } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const profile = useQuery(api.users.getMyProfile);

    useEffect(() => {
        setMounted(true);
        if (isLoaded && !isSignedIn) {
            router.push("/login");
        }
    }, [isLoaded, isSignedIn, router]);

    // ── Industry-based routing ──────────────────────────────
    useEffect(() => {
        if (!profile || !profile.industry) return;

        const targetBase = industryRoutes[profile.industry];

        // Unknown industry → fallback
        if (!targetBase) {
            router.push("/beauty");
            return;
        }

        // Bare dashboard root → redirect to vertical module
        if (pathname === "/") {
            router.push(targetBase);
            return;
        }

        // Allow shared routes (settings, etc.)
        const sharedPaths = ["/settings", "/ai-inbox", "/gap-optimizer"];
        if (sharedPaths.some((p) => pathname.startsWith(p))) return;

        // If in the wrong vertical module, redirect
        if (!pathname.startsWith(targetBase)) {
            router.push(targetBase);
        }
    }, [profile, pathname, router]);

    if (!isLoaded || profile === undefined) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (profile && !profile.orgId) {
        router.push("/onboarding");
        return null;
    }

    // ── Resolve nav links from vertical config ──────────────
    const industry = profile?.industry ?? "beauty_wellness";
    const { basePath: industryBase, links: primaryLinks } = getNavLinks(industry);

    return (
        <div className="flex w-full flex-col h-screen overflow-hidden">
            <header className="flex h-20 shrink-0 items-center justify-between px-4 md:px-8 z-50 relative w-full pt-4 bg-background/80 backdrop-blur-xl">
                <div className="flex items-center justify-between w-full max-w-[1700px] mx-auto relative">
                    <div className="flex items-center gap-2 shrink-0">
                        <Logo />
                    </div>

                    <nav className="hidden md:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
                        {primaryLinks.map((link) => {
                            const isActive = pathname === link.href || (link.href !== industryBase && pathname.startsWith(link.href));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "flex items-center justify-center gap-2 h-10 rounded-full transition-all duration-300 ease-in-out cursor-pointer active:scale-[0.98]",
                                        isActive
                                            ? "bg-primary text-primary-foreground px-4 shadow-sm"
                                            : "hover:bg-secondary text-muted-foreground w-10 px-0"
                                    )}
                                    title={!isActive ? link.label : undefined}
                                >
                                    <div className={cn("shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")}>
                                        {link.icon}
                                    </div>
                                    {isActive && (
                                        <span className="text-sm font-semibold whitespace-nowrap overflow-hidden animate-in fade-in zoom-in-95 leading-none mt-0.5">
                                            {link.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-4 shrink-0 justify-end">
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-secondary text-primary hover:bg-secondary/80 transition-colors border border-border/40 active:scale-[0.98]"
                        >
                            {mounted && (theme === "dark" ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />)}
                            {!mounted && <div className="h-5 w-5" />}
                        </button>
                        {profile?.orgId && <NotificationBell orgId={profile.orgId} />}
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="outline-none">
                                    <img
                                        src={profile?.user?.avatarUrl || "https://ui-avatars.com/api/?name=User"}
                                        className="h-10 w-10 flex-shrink-0 rounded-full border border-border/60 shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
                                        alt="Avatar"
                                    />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{profile?.user?.name || user?.fullName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.primaryEmailAddress?.emailAddress}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                                        <IconSettings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:bg-destructive/10">
                                    <IconLogout className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full bg-background relative z-0">
                {children}
            </main>
        </div>
    );
}
