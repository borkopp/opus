"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { StaffFormDialog } from "./StaffFormDialog";
import { IconEdit, IconTrash, IconPlus } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function StaffList({ orgId, onAddClick }: { orgId: Id<"orgs">; onAddClick: () => void }) {
    const staff = useQuery(api.staff.listStaffMembers, { orgId });
    const deactivateStaffMember = useMutation(api.staff.deactivateStaffMember);
    const [editingStaffId, setEditingStaffId] = useState<Id<"staff_members"> | null>(null);

    if (staff === undefined) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-[160px] rounded-xl" />
                ))}
            </div>
        );
    }

    if (staff.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
                <div className="rounded-full bg-muted p-4">
                    {/* Placeholder Icon */}
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">No staff members</h3>
                <p className="mt-2 text-sm text-muted-foreground w-full max-w-sm">
                    Get started by adding your first staff member to your team so they can be booked.
                </p>
                <Button onClick={onAddClick} className="mt-6 flex items-center gap-2">
                    <IconPlus size={18} />
                    Add Staff
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6">


                {staff.map((member) => {
                    const isInactive = !member.isActive;

                    return (
                        <Card key={member._id} className={cn("group relative overflow-hidden transition-all", isInactive && "opacity-75 grayscale hover:grayscale-0")}>
                            <CardContent className="p-5 pl-7 flex flex-col gap-4">
                                <div className="flex items-start gap-4">
                                    <Avatar className={cn("h-12 w-12 border bg-muted", isInactive && "opacity-50 grayscale")}>
                                        <AvatarImage src={member.avatarUrl} alt={member.displayName} className="object-cover" />
                                        <AvatarFallback className="font-semibold text-lg">{member.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <h3 className={cn("font-semibold text-lg truncate", isInactive ? "text-muted-foreground" : "text-foreground")}>{member.displayName}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={cn(
                                                "text-[10px]  font-outfit uppercase tracking-wider",
                                                member.role === "owner" ? "text-primary" :
                                                    member.role === "manager" ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                                            )}>{member.role}</span>
                                            <span className="w-1 h-1 rounded-full bg-border"></span>
                                            <Badge variant={member.isActive ? "default" : "secondary"} className={member.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/40 font-medium border-emerald-200 dark:border-emerald-800" : "font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}>
                                                {member.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 mt-1">
                                    {member.specialties && member.specialties.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {member.specialties.map((spec: string, i: number) => (
                                                <Badge key={i} variant="outline" className={cn("text-xs truncate max-w-[140px] font-normal", isInactive ? "text-muted-foreground/50 border-border/50" : "text-muted-foreground")}>
                                                    {spec}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                                            <span className="italic font-medium">No specialties added</span>
                                            <button
                                                onClick={() => setEditingStaffId(member._id)}
                                                className="text-primary italic hover:underline hover:text-primary/80 font-semibold"
                                            >
                                                click here to add
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 pt-6 border-t w-full">
                                    <Button variant="outline" size="lg" asChild className="w-full text-xs hover:bg-primary/5 hover:text-primary hover:border-primary/30 shadow-m dark:shadow-m rounded-full dark:border-none transition-colors">
                                        <Link href={`/staff/${member._id}`}>View Profile</Link>
                                    </Button>
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/90 backdrop-blur-sm p-1 rounded-md shadow-s dark:shadow-l">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingStaffId(member._id)}
                                        className="h-8 w-8 text-muted-foreground hover:text-blue-600 shadow-s dark:shadow-s dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                                        title="Edit Profile"
                                    >
                                        <IconEdit size={16} stroke={2} />
                                    </Button>
                                    {member.isActive ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => { if (confirm(`Are you sure you want to deactivate ${member.displayName}?`)) deactivateStaffMember({ orgId, staffId: member._id }) }}
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                            title="Deactivate Staff"
                                        >
                                            <IconTrash size={16} stroke={2} />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => { alert("Reactivate UI needs backend implementation or update"); }} // Assuming we need to implement Reactivation since deactivateStaffMember exists
                                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md"
                                            title="Reactivate Staff"
                                        >
                                            {/* Simple placeholder icon for un-trash/reactivate */}
                                            <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-arrow-back-up" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 14l-4 -4l4 -4" /><path d="M5 10h11a4 4 0 1 1 0 8h-1" /></svg>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
                {/* Add Staff Card */}
                <button
                    onClick={onAddClick}
                    className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border/60 bg-muted/10 py-[43px] text-center hover:bg-muted/40 transition-colors group cursor-pointer h-full min-h-[160px]"
                >
                    <div className="rounded-full bg-primary/10 p-3 group-hover:scale-110 group-active:scale-95 transition-all text-primary">
                        <IconPlus stroke={2.5} size={24} />
                    </div>
                    <div className="flex flex-col gap-1 px-6">
                        <h3 className="font-semibold text-foreground">Add Staff Member</h3>
                        <p className="text-sm text-muted-foreground w-full max-w-[240px]">Expand your team by adding a new staff member.</p>
                    </div>
                </button>
            </div>

            {editingStaffId && (
                <StaffFormDialog
                    orgId={orgId}
                    staffId={editingStaffId}
                    open={!!editingStaffId}
                    onOpenChange={(open) => !open && setEditingStaffId(null)}
                />
            )}
        </>
    );
}
