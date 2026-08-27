"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/sidebar";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";
import { useTheme } from "next-themes";
import { getNavLinks } from "@/lib/vertical-nav-config";
import { ACTIVE_DASHBOARD_PATH, ACTIVE_INDUSTRY } from "@/lib/product-scope";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconLogout, IconSettings } from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    const profile = useQuery(
        api.users.getMyProfile,
        isAuthenticated ? {} : "skip",
    );

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        if (profile && !profile.orgId) {
            router.replace("/onboarding");
        }
    }, [profile, router]);

    // ── Industry-based routing ──────────────────────────────
    useEffect(() => {
        if (!profile || !profile.industry) return;

        const targetBase = ACTIVE_DASHBOARD_PATH;

        // Bare dashboard root → redirect to vertical module
        if (pathname === "/") {
            router.push(targetBase);
            return;
        }

        // Allow shared routes (settings, etc.)
        const sharedPaths = ["/settings", "/notifications"];
        if (sharedPaths.some((p) => pathname.startsWith(p))) return;

        // If in the wrong vertical module, redirect
        if (!pathname.startsWith(targetBase)) {
            router.push(targetBase);
        }
    }, [profile, pathname, router]);

    if (isLoading || (isAuthenticated && !profile)) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    if (profile && !profile.orgId) return null;

    // ── Resolve nav links from vertical config ──────────────
    const industry = profile?.industry === ACTIVE_INDUSTRY ? profile.industry : ACTIVE_INDUSTRY;
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
                            <IconMoon className="h-5 w-5 dark:hidden" />
                            <IconSun className="hidden h-5 w-5 dark:block" />
                        </button>
                        {profile?.orgId && <NotificationBell orgId={profile.orgId} />}
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="outline-none">
                                    <Avatar className="h-10 w-10 border border-border/60 shadow-sm transition-all hover:ring-2 hover:ring-primary/20">
                                        <AvatarImage src={profile?.user?.avatarUrl} alt={profile?.user?.name ?? "User"} />
                                        <AvatarFallback>{(profile?.user?.name ?? "U").charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{profile?.user?.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {profile?.user?.email}
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
                                <DropdownMenuItem
                                    onClick={() => {
                                        void authClient.signOut().then(() => router.replace("/login"));
                                    }}
                                    className="text-destructive focus:bg-destructive/10"
                                >
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
