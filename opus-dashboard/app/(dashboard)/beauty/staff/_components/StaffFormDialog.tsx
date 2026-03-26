"use client";

import { useState, useEffect, useRef } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconUpload, IconLoader2 } from "@tabler/icons-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function StaffFormDialog({
    orgId,
    staffId,
    open,
    onOpenChange,
}: {
    orgId: Id<"orgs">;
    staffId?: Id<"staff_members">;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const isEdit = !!staffId;
    const existingStaff = useQuery(
        api.staff.getStaffMember,
        staffId ? { orgId, staffId } : "skip"
    );

    const createStaffMember = useMutation(api.staff.createStaffMember);
    const updateStaffMember = useMutation(api.staff.updateStaffMember);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    const [displayName, setDisplayName] = useState("");
    const [role, setRole] = useState<"owner" | "manager" | "staff">("staff");
    const [bio, setBio] = useState("");
    const [specialties, setSpecialties] = useState("");
    const [payoutSharePct, setPayoutSharePct] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEdit && existingStaff) {
            setDisplayName(existingStaff.displayName);
            setRole(existingStaff.role);
            setBio(existingStaff.bio || "");
            setSpecialties((existingStaff.specialties || []).join(", "));
            setPayoutSharePct(existingStaff.payoutSharePct?.toString() || "");
            setAvatarUrl(existingStaff.avatarUrl || "");
            setIsActive(existingStaff.isActive ?? true);
        }
    }, [isEdit, existingStaff]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError("");

        try {
            const postUrl = await generateUploadUrl({ orgId });
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) throw new Error("Upload failed");

            const { storageId } = await result.json();
            setAvatarUrl(storageId);
        } catch (err: any) {
            setError(err.message || "Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSaving(true);

        try {
            const specArray = specialties.split(",").map(s => s.trim()).filter(Boolean);
            const payoutNum = payoutSharePct ? parseInt(payoutSharePct) : undefined;

            if (isEdit && staffId) {
                await updateStaffMember({
                    orgId,
                    staffId,
                    displayName,
                    role,
                    bio,
                    specialties: specArray,
                    payoutSharePct: payoutNum,
                    avatarUrl,
                    isActive,
                });
            } else {
                await createStaffMember({
                    orgId,
                    displayName,
                    role,
                    bio,
                    specialties: specArray,
                    payoutSharePct: payoutNum,
                    avatarUrl,
                });
            }
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || "Failed to save staff member");
        } finally {
            setIsSaving(false);
        }
    };

    const getImageUrl = (urlOrId: string) => {
        if (!urlOrId) return undefined;
        if (urlOrId.startsWith("http")) return urlOrId;
        return `https://${process.env.NEXT_PUBLIC_CONVEX_URL?.split('//')[1]}/api/storage/${urlOrId}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Make changes to this staff profile." : "Add a new member to your team."}
                    </DialogDescription>
                </DialogHeader>

                <form id="staff-form" onSubmit={handleSubmit} className="flex flex-col gap-6 py-4">

                    {/* Avatar row */}
                    <div className="flex flex-col gap-3">
                        <Label>Profile Photo</Label>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border bg-muted">
                                <AvatarImage src={getImageUrl(avatarUrl)} alt="Avatar" className="object-cover" />
                                <AvatarFallback className="text-muted-foreground"><IconUpload size={24} /></AvatarFallback>
                            </Avatar>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm">
                                {isUploading ? <IconLoader2 className="animate-spin w-4 h-4 mr-2" /> : "Upload Image"}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name">Display Name <span className="text-red-500">*</span></Label>
                            <Input id="name" required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. John Doe" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
                            <select id="role" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={role} onChange={e => setRole(e.target.value as any)}>
                                <option value="staff">Staff (Standard)</option>
                                <option value="manager">Manager</option>
                                <option value="owner">Owner</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" className="min-h-[80px]" value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio for the booking page..." />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="specs">Specialties</Label>
                            <Input id="specs" value={specialties} onChange={e => setSpecialties(e.target.value)} placeholder="Fades, Trims (comma separated)" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="payout">Payout Share (%)</Label>
                            <Input id="payout" type="number" min="0" max="100" value={payoutSharePct} onChange={e => setPayoutSharePct(e.target.value)} placeholder="e.g. 70" />
                        </div>
                    </div>

                    {isEdit && (
                        <div className="flex items-center space-x-2 rounded-lg border p-3 shadow-sm mt-2">
                            <Checkbox id="isActive" checked={isActive} onCheckedChange={(c) => setIsActive(!!c)} />
                            <Label htmlFor="isActive" className="font-medium cursor-pointer">
                                Account is Active
                            </Label>
                        </div>
                    )}

                    {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                </form>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button type="submit" form="staff-form" disabled={isSaving || isUploading}>
                        {isSaving && <IconLoader2 className="animate-spin w-4 h-4 mr-2" />}
                        {isEdit ? "Save Changes" : "Add Staff"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
