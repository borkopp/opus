"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useMemo } from "react";
import { ServiceFormDialog } from "./ServiceFormDialog";
import { IconEdit, IconTrash, IconArrowUp, IconArrowDown, IconClock, IconTag, IconSearch } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ui/price";

export function ServiceList({
    orgId,
    searchQuery,
    selectedServiceIds,
    setSelectedServiceIds,
}: {
    orgId: Id<"orgs">;
    searchQuery: string;
    selectedServiceIds: Set<Id<"services">>;
    setSelectedServiceIds: React.Dispatch<React.SetStateAction<Set<Id<"services">>>>;
}) {
    const categories = useQuery(api.serviceCategories.listCategories, { orgId });
    const allServices = useQuery(api.services.listServices, { orgId });
    const deactivateService = useMutation(api.services.deactivateService);
    const reorderServices = useMutation(api.services.reorderServices);

    const [editingServiceId, setEditingServiceId] = useState<Id<"services"> | null>(null);
    const [isAdding, setIsAdding] = useState<{ open: boolean; categoryId?: Id<"service_categories"> }>({ open: false });

    const filteredServices = useMemo(() => {
        if (!allServices || !categories) return [];
        if (!searchQuery.trim()) return allServices;
        const query = searchQuery.toLowerCase();
        return allServices.filter(s => {
            const catName = categories.find(c => c._id === s.categoryId)?.name || "uncategorized";
            return s.name.toLowerCase().includes(query) || catName.toLowerCase().includes(query);
        });
    }, [allServices, searchQuery, categories]);

    if (categories === undefined || allServices === undefined) {
        return <Skeleton className="h-[600px] w-full rounded-xl" />;
    }

    // We group services by category
    // Services without category get grouped under "Uncategorized"
    const servicesByCategory = new Map<string, typeof allServices>();

    // Initialize with known categories
    categories.forEach(cat => {
        servicesByCategory.set(cat._id, []);
    });
    servicesByCategory.set('uncategorized', []);

    filteredServices.forEach(srv => {
        if (srv.categoryId && servicesByCategory.has(srv.categoryId)) {
            servicesByCategory.get(srv.categoryId)!.push(srv);
        } else {
            servicesByCategory.get('uncategorized')!.push(srv);
        }
    });

    const handleDelete = async (serviceId: Id<"services">, name: string) => {
        if (window.confirm(`Are you sure you want to deactivate the service "${name}"?`)) {
            await deactivateService({ orgId, serviceId });
        }
    };

    const toggleSelection = (id: Id<"services">) => {
        const next = new Set(selectedServiceIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedServiceIds(next);
    };

    const moveService = async (serviceArr: typeof allServices, index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === serviceArr.length - 1) return;

        const newOrder = [...serviceArr];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];

        const serviceIds = newOrder.map(c => c._id);
        await reorderServices({ orgId, serviceIds });
    };

    const renderServiceRows = (srvs: typeof allServices, catId?: Id<"service_categories">) => {
        if (srvs.length === 0) {
            return (
                <div className="text-sm text-muted-foreground p-6 rounded-lg text-center border border-dashed bg-background">
                    No services in this list yet.
                    <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => setIsAdding({ open: true, categoryId: catId })}>Add Service</Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-2">
                {srvs.map((service, index) => {
                    const isInactive = !service.isActive;
                    return (
                        <div key={service._id} className={cn(
                            "flex items-center gap-3 p-3 bg-background border rounded-xl shadow-sm group transition-all hover:border-border hover:shadow-md relative",
                            isInactive && "opacity-75 bg-muted/30 grayscale hover:grayscale-0"
                        )}>

                            <div className="flex items-center justify-center pl-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Checkbox
                                    checked={selectedServiceIds.has(service._id)}
                                    onCheckedChange={() => toggleSelection(service._id)}
                                />
                            </div>

                            {/* Reorder arrows */}
                            <div className="flex flex-col items-center opacity-30 group-hover:opacity-100 transition-opacity ml-1">
                                <button onClick={() => moveService(srvs, index, 'up')} disabled={index === 0 || searchQuery !== ""} className="hover:text-foreground disabled:opacity-30 cursor-pointer">
                                    <IconArrowUp size={14} />
                                </button>
                                <button onClick={() => moveService(srvs, index, 'down')} disabled={index === srvs.length - 1 || searchQuery !== ""} className="hover:text-foreground disabled:opacity-30 cursor-pointer">
                                    <IconArrowDown size={14} />
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
                                <div className="flex items-center gap-2">
                                    <span className={cn("font-semibold text-foreground truncate", isInactive && "line-through text-muted-foreground")}>{service.name}</span>
                                    <Badge variant={isInactive ? "secondary" : "outline"} className={cn(
                                        "font-medium",
                                        !isInactive ? "border-foreground/20 text-foreground/80" : "bg-muted text-muted-foreground"
                                    )}>
                                        {isInactive ? "Inactive" : "Active"}
                                    </Badge>
                                </div>

                                {/* {service.description && (
                                    <p className="text-sm text-muted-foreground truncate max-w-lg mt-0.5">{service.description}</p>
                                )} */}

                                <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <IconClock size={14} />
                                        <span>{service.durationMins} min</span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-border"></div>
                                    <div className="flex items-center gap-1 font-medium text-foreground/80">
                                        <IconTag size={14} className="text-muted-foreground" />
                                        <span>
                                            <Price amount={service.priceMinorUnits} />
                                        </span>
                                    </div>
                                    {service.staffIds.length > 0 && (
                                        <>
                                            <div className="w-1 h-1 rounded-full bg-border"></div>
                                            <span className="truncate max-w-[120px]">{service.staffIds.length} Staff</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Hover Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="icon" variant="ghost"
                                    onClick={() => setEditingServiceId(service._id)}
                                    className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                    <IconEdit size={16} />
                                </Button>
                                <Button
                                    size="icon" variant="ghost"
                                    onClick={() => handleDelete(service._id, service.name)}
                                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <IconTrash size={16} />
                                </Button>
                            </div>
                        </div>
                    )
                })}
                <div className="mt-1">
                    <Button variant="ghost" size="lg" onClick={() => setIsAdding({ open: true, categoryId: catId })} className="w-full border border-dashed mt-2">
                        + Add Service here
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Card className="h-full flex flex-col p-6">
            <div className="flex flex-col gap-8">
                {categories.map(category => {
                    const srvs = servicesByCategory.get(category._id) || [];
                    return (
                        <div key={category._id} className="flex flex-col gap-3">
                            <div className="flex items-center justify-between pb-2 border-b">
                                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                    {category.name}
                                    <Badge variant="secondary" className="px-1.5 font-normal rounded-md">{srvs.length}</Badge>
                                </h3>
                            </div>
                            {renderServiceRows(srvs, category._id)}
                        </div>
                    );
                })}

                {/* Uncategorized */}
                {(servicesByCategory.get('uncategorized') || []).length > 0 && (
                    <div className="flex flex-col gap-3 opacity-80">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                                Uncategorized
                                <Badge variant="secondary" className="px-1.5 font-normal rounded-md text-muted-foreground">
                                    {(servicesByCategory.get('uncategorized') || []).length}
                                </Badge>
                            </h3>
                        </div>
                        {renderServiceRows(servicesByCategory.get('uncategorized') || [])}
                    </div>
                )}
            </div>

            {(isAdding.open || editingServiceId !== null) && (
                <ServiceFormDialog
                    orgId={orgId}
                    serviceId={editingServiceId || undefined}
                    initialCategoryId={isAdding.categoryId}
                    open={isAdding.open || editingServiceId !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsAdding({ open: false });
                            setEditingServiceId(null);
                        }
                    }}
                />
            )}
        </Card>
    );
}
