"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconCalendarEvent, IconTrash, IconPlus, IconLoader2 } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/file-validation";

export function TimeOffSection({ orgId, staffId }: { orgId: Id<"orgs">; staffId: Id<"staff_members"> }) {
    const overrides = useQuery(api.availabilityOverrides.listOverrides, { orgId, staffId });
    const deleteOverride = useMutation(api.availabilityOverrides.deleteOverride);
    const createOverride = useMutation(api.availabilityOverrides.createOverride);

    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form state
    const [date, setDate] = useState("");
    const [type, setType] = useState<"day_off" | "custom_hours">("day_off");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [note, setNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    if (overrides === undefined) {
        return <Skeleton className="h-[200px] w-full mt-6 rounded-xl" />;
    }

    const handleDelete = async (overrideId: Id<"availability_overrides">, dateStr: string) => {
        if (!window.confirm(`Are you sure you want to remove the override for ${dateStr}?`)) return;
        try {
            await deleteOverride({ orgId, overrideId });
            toast.success("Override removed");
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to remove override"));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!date) return alert("Select a date");

        setIsSaving(true);
        try {
            await createOverride({
                orgId,
                staffId,
                date,
                type,
                startTime: type === "custom_hours" ? startTime : undefined,
                endTime: type === "custom_hours" ? endTime : undefined,
                note: note.trim() || undefined,
            });
            setIsAddOpen(false);
            toast.success("Schedule exception saved");
            // Reset form
            setDate("");
            setType("day_off");
            setStartTime("09:00");
            setEndTime("17:00");
            setNote("");
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Failed to add override"));
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-fill today for simplicity if none selected initially
    const handleOpenBox = () => {
        const d = new Date().toISOString().split('T')[0];
        setDate(d);
        setIsAddOpen(true);
    };

    return (
        <div className="w-full mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                    <IconCalendarEvent size={18} className="text-muted-foreground" />
                    <h3 className="font-semibold text-foreground tracking-tight">Overrides & Time-Off</h3>
                </div>
                <Button variant="outline" size="sm" onClick={handleOpenBox} className="mt-3 sm:mt-0 gap-1.5 h-8">
                    <IconPlus size={14} /> Add Exception
                </Button>
            </div>

            <Card className="shadow-none border border-border/60 bg-muted/10">
                <CardContent className="p-0">
                    {overrides.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No overrides recorded.
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {overrides.map(o => (
                                <div key={o._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                                    <div className="flex items-start sm:items-center gap-4">
                                        <div className="font-semibold w-28 shrink-0">{o.date}</div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                {o.type === "day_off" ? (
                                                    <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Day Off</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Custom Hours</Badge>
                                                )}
                                                {o.type === "custom_hours" && (
                                                    <span className="text-sm font-medium">{o.startTime} - {o.endTime}</span>
                                                )}
                                            </div>
                                            {o.note && <span className="text-sm text-muted-foreground">{o.note}</span>}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost" size="icon"
                                        onClick={() => handleDelete(o._id, o.date)}
                                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrinks-0"
                                    >
                                        <IconTrash size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Schedule Exception</DialogTitle>
                        <DialogDescription>
                            This will override their normal recurring availability for a specific date.
                        </DialogDescription>
                    </DialogHeader>

                    <form id="override-form" onSubmit={handleSave} className="flex flex-col gap-5 py-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="date">Date <span className="text-red-500">*</span></Label>
                            <Input
                                id="date"
                                type="date"
                                required
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Type of Exception</Label>
                            <div className="grid grid-cols-2 gap-3 mt-1">
                                <div
                                    onClick={() => setType("day_off")}
                                    className={`border rounded-lg p-3 text-center cursor-pointer transition-colors ${type === "day_off" ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300' : 'hover:bg-muted/50 text-muted-foreground'}`}
                                >
                                    <span className="font-semibold text-sm">Full Day Off</span>
                                </div>
                                <div
                                    onClick={() => setType("custom_hours")}
                                    className={`border rounded-lg p-3 text-center cursor-pointer transition-colors ${type === "custom_hours" ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' : 'hover:bg-muted/50 text-muted-foreground'}`}
                                >
                                    <span className="font-semibold text-sm">Custom Hours</span>
                                </div>
                            </div>
                        </div>

                        {type === "custom_hours" && (
                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="start">Start Time</Label>
                                    <Input id="start" type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="end">End Time</Label>
                                    <Input id="end" type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="note">Internal Note (Optional)</Label>
                            <Input
                                id="note"
                                placeholder="e.g. Vacation, Doctor appointment..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            />
                        </div>
                    </form>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancel</Button>
                        <Button type="submit" form="override-form" disabled={isSaving}>
                            {isSaving && <IconLoader2 className="animate-spin w-4 h-4 mr-2" />}
                            Save Exception
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
