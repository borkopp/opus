"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { CategoryList } from "./_components/CategoryList";
import { ServiceList } from "./_components/ServiceList";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconSearch } from "@tabler/icons-react";

export default function ServicesPage() {
    const profile = useQuery(api.users.getMyProfile);
    const orgId = profile?.orgId;
    const allServices = useQuery(api.services.listServices, orgId ? { orgId } : "skip");

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedServiceIds, setSelectedServiceIds] = useState<Set<Id<"services">>>(new Set());
    const deactivateService = useMutation(api.services.deactivateService);

    const handleBulkDeactivate = async () => {
        if (!orgId || selectedServiceIds.size === 0) return;
        if (window.confirm(`Are you sure you want to deactivate ${selectedServiceIds.size} service(s)?`)) {
            for (const id of selectedServiceIds) {
                await deactivateService({ orgId, serviceId: id });
            }
            setSelectedServiceIds(new Set());
        }
    };

    if (profile === undefined || allServices === undefined) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-10">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Skeleton className="h-[400px] w-full col-span-1 rounded-xl" />
                    <Skeleton className="h-[400px] w-full col-span-1 md:col-span-2 rounded-xl" />
                </div>
            </div>
        );
    }

    if (profile === null || !orgId) return <div>Not found</div>;

    const activeCount = allServices?.filter(s => s.isActive).length || 0;

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1700px] mx-auto pb-10">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground flex items-baseline gap-3">
                            Services
                            <span className="text-base font-normal font-outfit text-muted-foreground tracking-normal">
                                · {activeCount} active
                            </span>
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">Manage your service categories and offerings.</p>
                    </div>
                    {(allServices && allServices.length > 0) && (
                        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            {selectedServiceIds.size > 0 && (
                                <Button variant="outline" size="sm" onClick={handleBulkDeactivate} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 whitespace-nowrap">
                                    Deactivate {selectedServiceIds.size} selected
                                </Button>
                            )}
                            <div className="relative w-full sm:w-64 shadow-s dark:shadow-l rounded-full">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                <Input
                                    placeholder="Search services..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 w-full rounded-full bg-background"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-1">
                    <CategoryList orgId={orgId as Id<"orgs">} />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <ServiceList
                        orgId={orgId as Id<"orgs">}
                        searchQuery={searchQuery}
                        selectedServiceIds={selectedServiceIds}
                        setSelectedServiceIds={setSelectedServiceIds}
                    />
                </div>
            </div>
        </div>
    );
}
