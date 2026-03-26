"use client";

import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { IconLoader2 } from "@tabler/icons-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function ServiceFormDialog({
    orgId,
    serviceId,
    initialCategoryId,
    open,
    onOpenChange,
}: {
    orgId: Id<"orgs">;
    serviceId?: Id<"services">;
    initialCategoryId?: Id<"service_categories">;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const isEdit = !!serviceId;

    const existingService = useQuery(
        api.services.getService,
        serviceId ? { orgId, serviceId } : "skip"
    );
    const orgSettings = useQuery(api.services.getOrgSettings, { orgId });
    const categories = useQuery(api.serviceCategories.listCategories, { orgId });
    const staffMembers = useQuery(api.staff.listStaffMembers, { orgId });

    const createService = useMutation(api.services.createService);
    const updateService = useMutation(api.services.updateService);
    const allServices = useQuery(api.services.listServices, { orgId });

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [durationMins, setDurationMins] = useState("");
    const [priceMinorUnits, setPriceMinorUnits] = useState(""); // Represented in string in form but converted
    const [categoryId, setCategoryId] = useState<string>("uncategorized");
    const [staffIds, setStaffIds] = useState<string[]>([]);
    const [isActive, setIsActive] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isEdit && initialCategoryId) {
            setCategoryId(initialCategoryId);
        }
    }, [isEdit, initialCategoryId]);

    useEffect(() => {
        if (isEdit && existingService) {
            setName(existingService.name);
            setDescription(existingService.description || "");
            setDurationMins(existingService.durationMins.toString());
            setPriceMinorUnits((existingService.priceMinorUnits / 100).toFixed(2));
            setCategoryId(existingService.categoryId || "uncategorized");
            setStaffIds(existingService.staffIds);
            setIsActive(existingService.isActive ?? true);
        } else if (!isEdit) {
            // defaults
            setDurationMins(orgSettings?.slotDurationMins?.toString() || "15");
            if (staffMembers && staffIds.length === 0) {
                // Auto-select all staff by default for a new service
                setStaffIds(staffMembers.map(s => s._id));
            }
        }
    }, [isEdit, existingService, orgSettings, staffMembers, open]); // trigger on open so defaults apply

    const toggleStaffId = (id: string, checked: boolean) => {
        if (checked) setStaffIds(prev => [...prev, id]);
        else setStaffIds(prev => prev.filter(s => s !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) return setError("Name is required");
        if (!durationMins || parseInt(durationMins) <= 0) return setError("Duration must be greater than 0");
        if (staffIds.length === 0) return setError("Select at least one staff member who can perform this service");

        const priceNum = Math.round(parseFloat(priceMinorUnits) * 100);
        if (isNaN(priceNum) || priceNum < 0) return setError("Invalid price");

        setIsSaving(true);

        try {
            const catId = categoryId === "uncategorized" ? undefined : (categoryId as Id<"service_categories">);

            if (isEdit && serviceId) {
                await updateService({
                    orgId,
                    serviceId,
                    name: name.trim(),
                    description: description.trim() || undefined,
                    durationMins: parseInt(durationMins),
                    priceMinorUnits: priceNum,
                    currency: orgSettings?.currency || "USD",
                    categoryId: catId || null,
                    staffIds: staffIds as Id<"staff_members">[],
                    isActive,
                });
            } else {
                // To safely get sort order, list logic:
                const groupServices = allServices?.filter(s => s.categoryId === catId) || [];
                const maxOrder = groupServices.length > 0 ? Math.max(...groupServices.map(s => s.sortOrder)) : 0;

                await createService({
                    orgId,
                    name: name.trim(),
                    description: description.trim() || undefined,
                    durationMins: parseInt(durationMins),
                    priceMinorUnits: priceNum,
                    currency: orgSettings?.currency || "USD",
                    categoryId: catId,
                    staffIds: staffIds as Id<"staff_members">[],
                    sortOrder: maxOrder + 1,
                });
            }
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || "Failed to save service");
        } finally {
            setIsSaving(false);
        }
    };

    if (orgSettings === undefined || orgSettings === null || categories === undefined || staffMembers === undefined || (isEdit && existingService === undefined)) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px]">
                    <div className="flex flex-col gap-4 py-8 items-center justify-center">
                        <IconLoader2 className="animate-spin text-muted-foreground w-8 h-8" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Service" : "Add Service"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update service details, pricing, and staff assignments." : "Create a new bookable service for your clients."}
                    </DialogDescription>
                </DialogHeader>

                <form id="service-form" onSubmit={handleSubmit} className="flex flex-col gap-6 py-4">

                    {/* Basic Details */}
                    <div className="flex flex-col gap-4 p-4 rounded-xl border bg-muted/20">
                        <h4 className="text-sm font-semibold text-foreground">Basic Details</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="name">Service Name <span className="text-red-500">*</span></Label>
                                <Input id="name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wash & Cut" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="categoryId">Category</Label>
                                <select
                                    id="categoryId"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={categoryId}
                                    onChange={e => setCategoryId(e.target.value)}
                                >
                                    <option value="uncategorized">No Category (Uncategorized)</option>
                                    {categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea id="description" className="min-h-[60px]" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description visible to customers..." />
                        </div>
                    </div>

                    {/* Rules & Pricing */}
                    <div className="flex flex-col gap-4 p-4 rounded-xl border bg-muted/20">
                        <h4 className="text-sm font-semibold text-foreground">Pricing & Duration</h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="duration">Duration (minutes) <span className="text-red-500">*</span></Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="duration"
                                        type="number"
                                        required
                                        min={orgSettings.slotDurationMins}
                                        step={orgSettings.slotDurationMins}
                                        value={durationMins}
                                        onChange={e => setDurationMins(e.target.value)}
                                        placeholder={`e.g. ${orgSettings.slotDurationMins}`}
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">Step: {orgSettings.slotDurationMins}m</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="price">Price ({orgSettings.currency || 'USD'}) <span className="text-red-500">*</span></Label>
                                <Input
                                    id="price"
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={priceMinorUnits}
                                    onChange={e => setPriceMinorUnits(e.target.value)}
                                    placeholder="e.g. 25.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Staff Assignments */}
                    <div className="flex flex-col gap-3 p-4 rounded-xl border bg-muted/20">
                        <h4 className="text-sm font-semibold text-foreground">Who can perform this service? <span className="text-red-500">*</span></h4>
                        <p className="text-xs text-muted-foreground -mt-1 mb-1">Select all staff members qualified to offer this service.</p>

                        {staffMembers.length === 0 ? (
                            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">You have no staff members yet. Please add staff before assigning services.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[140px] overflow-y-auto p-1">
                                {staffMembers.map(staff => (
                                    <div key={staff._id} className="flex items-center space-x-2 border rounded-lg p-2.5 bg-background shadow-sm">
                                        <Checkbox
                                            id={`staff-${staff._id}`}
                                            checked={staffIds.includes(staff._id)}
                                            onCheckedChange={(c) => toggleStaffId(staff._id, !!c)}
                                        />
                                        <Label htmlFor={`staff-${staff._id}`} className="flex-1 font-medium cursor-pointer truncate">
                                            {staff.displayName} <span className="text-muted-foreground font-normal ml-1 capitalize">({staff.role})</span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status (Edit Only) */}
                    {isEdit && (
                        <div className="flex items-center space-x-2 rounded-lg border p-3 shadow-sm bg-background">
                            <Checkbox id="isActive" checked={isActive} onCheckedChange={(c) => setIsActive(!!c)} />
                            <Label htmlFor="isActive" className="font-medium cursor-pointer">
                                Service is Active (Available for booking)
                            </Label>
                        </div>
                    )}

                    {error && <p className="text-sm text-destructive font-medium bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
                </form>

                <DialogFooter className="mt-4 border-t pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button type="submit" form="service-form" disabled={isSaving}>
                        {isSaving && <IconLoader2 className="animate-spin w-4 h-4 mr-2" />}
                        {isEdit ? "Save Changes" : "Create Service"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
