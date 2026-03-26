"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { IconClock, IconCopy, IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function WeeklySchedule({ orgId, staffId }: { orgId: Id<"orgs">; staffId: Id<"staff_members"> }) {
    const defaultSchedule = useQuery(api.availability.getWeeklySchedule, { orgId, staffId });
    const setAvailabilityRule = useMutation(api.availability.setAvailabilityRule);
    const deleteAvailabilityRule = useMutation(api.availability.deleteAvailabilityRule);
    const copyToAll = useMutation(api.availability.copyScheduleToAllStaff);

    const [savingStates, setSavingStates] = useState<Record<number, boolean>>({});
    const [isCopying, setIsCopying] = useState(false);

    if (defaultSchedule === undefined) {
        return <Skeleton className="h-[600px] w-full rounded-xl" />;
    }

    const handleSaveDay = async (day: number, data: any) => {
        setSavingStates(prev => ({ ...prev, [day]: true }));
        try {
            await setAvailabilityRule({
                orgId,
                staffId,
                dayOfWeek: day,
                startTime: data.startTime,
                endTime: data.endTime,
                breaks: data.breaks,
                isActive: data.isActive,
            });
        } catch (err: any) {
            alert(err.message || `Failed to save schedule for ${DAYS_OF_WEEK[day]}`);
        } finally {
            setSavingStates(prev => ({ ...prev, [day]: false }));
        }
    };

    const handleCopyAll = async () => {
        if (!window.confirm("Are you sure you want to copy this exact schedule to ALL other staff members? This will overwrite their existing recurring availability.")) return;

        setIsCopying(true);
        try {
            await copyToAll({ orgId, sourceStaffId: staffId });
            alert("Schedule copied perfectly to all staff.");
        } catch (err: any) {
            alert(err.message || "Failed to copy schedule");
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <IconClock size={22} className="text-blue-600" />
                        Recurring Availability
                    </CardTitle>
                    <CardDescription className="mt-1">Define the standard weekly working hours for this staff member.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyAll} disabled={isCopying} className="mt-3 sm:mt-0 gap-2">
                    {isCopying ? <IconLoader2 className="animate-spin w-4 h-4" /> : <IconCopy size={16} />}
                    Copy to all staff
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex flex-col gap-1.5 p-3">
                    {defaultSchedule.map((daySchedule) => (
                        <DayRow
                            key={daySchedule.dayOfWeek}
                            dayName={DAYS_OF_WEEK[daySchedule.dayOfWeek]}
                            schedule={daySchedule}
                            isSaving={savingStates[daySchedule.dayOfWeek] || false}
                            onSave={(data) => handleSaveDay(daySchedule.dayOfWeek, data)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function DayRow({
    dayName,
    schedule,
    isSaving,
    onSave
}: {
    dayName: string;
    schedule: any;
    isSaving: boolean;
    onSave: (data: any) => void;
}) {
    // Local copy to handle fast typing before flushing to server via blur/save
    const [isActive, setIsActive] = useState(schedule.isActive);
    const [startTime, setStartTime] = useState(schedule.startTime);
    const [endTime, setEndTime] = useState(schedule.endTime);
    const [breaks, setBreaks] = useState<{ startTime: string, endTime: string }[]>(schedule.breaks || []);

    const hasChanged =
        isActive !== schedule.isActive ||
        startTime !== schedule.startTime ||
        endTime !== schedule.endTime ||
        JSON.stringify(breaks) !== JSON.stringify(schedule.breaks);

    const handleApply = () => {
        onSave({ isActive, startTime, endTime, breaks });
        toast.success(`${dayName} schedule saved`);
    };

    const addBreak = () => {
        setBreaks([...breaks, { startTime: "12:00", endTime: "13:00" }]);
    };

    const updateBreak = (index: number, field: 'startTime' | 'endTime', value: string) => {
        const newB = [...breaks];
        newB[index][field] = value;
        setBreaks(newB);
    };

    const removeBreak = (index: number) => {
        const newB = [...breaks];
        newB.splice(index, 1);
        setBreaks(newB);
    };

    const toggleActive = () => {
        const newState = !isActive;
        setIsActive(newState);
        onSave({ isActive: newState, startTime, endTime, breaks });
        toast.success(`${dayName} marked as ${newState ? 'working day' : 'off'}`);
    }

    return (
        <div
            className={cn(
                "p-4 transition-all duration-200 border rounded-xl",
                isActive
                    ? "bg-card border-border shadow-sm ring-1 ring-primary/5"
                    : "bg-muted/30 border-transparent hover:bg-muted/50 cursor-pointer opacity-80"
            )}
            onClick={!isActive ? toggleActive : undefined}
        >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                {/* Toggle & Day Label */}
                <div
                    className="w-36 flex flex-shrink-0 items-center gap-3 cursor-pointer group"
                    onClick={isActive ? toggleActive : undefined}
                >
                    <div className="relative flex items-center justify-center pointer-events-none">
                        <Checkbox
                            id={`toggle-${dayName}`}
                            checked={isActive}
                            className="pointer-events-none data-[state=checked]:bg-primary"
                        />
                    </div>
                    <Label htmlFor={`toggle-${dayName}`} className={cn(
                        "font-semibold cursor-pointer user-select-none transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                        {dayName}
                    </Label>
                </div>

                {/* Times */}
                <div className="flex-1 flex flex-wrap items-center gap-3 w-full" onClick={(e) => isActive && e.stopPropagation()}>
                    {isActive ? (
                        <>
                            <div className="flex items-center gap-2">
                                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-[110px] text-sm h-9 font-medium" />
                                <span className="text-muted-foreground/60 px-1">—</span>
                                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-[110px] text-sm h-9 font-medium" />
                            </div>

                            {/* Breaks */}
                            <div className="flex flex-wrap gap-2 w-full mt-3 sm:mt-0 sm:w-auto sm:border-l sm:pl-5 sm:ml-2">
                                {breaks.map((b, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-amber-50/50 dark:bg-amber-500/5 p-1.5 rounded-lg border border-amber-200/50 dark:border-amber-500/20 shadow-sm relative group/break">
                                        <span className="text-[10px] font-bold text-amber-600/70 dark:text-amber-500/70 uppercase tracking-widest px-2">Break</span>
                                        <Input type="time" value={b.startTime} onChange={e => updateBreak(idx, 'startTime', e.target.value)} className="w-24 text-xs h-7 px-2 font-medium bg-white/50 dark:bg-zinc-900/50 border-amber-200/50 dark:border-amber-500/30" />
                                        <span className="text-muted-foreground/40">-</span>
                                        <Input type="time" value={b.endTime} onChange={e => updateBreak(idx, 'endTime', e.target.value)} className="w-24 text-xs h-7 px-2 font-medium bg-white/50 dark:bg-zinc-900/50 border-amber-200/50 dark:border-amber-500/30" />
                                        <button onClick={() => removeBreak(idx)} className="text-muted-foreground/50 hover:text-red-500 p-1.5 rounded-md opacity-0 group-hover/break:opacity-100 transition-opacity absolute -right-7">
                                            <IconTrash size={14} />
                                        </button>
                                    </div>
                                ))}
                                {breaks.length === 0 && (
                                    <Button variant="ghost" size="sm" onClick={addBreak} className="w-auto self-start h-8 text-xs text-muted-foreground hover:text-foreground font-medium hover:bg-muted duration-200">
                                        <IconPlus size={14} className="mr-1.5" /> Add Break
                                    </Button>
                                )}
                                {breaks.length > 0 && breaks.length < 3 && (
                                    <Button variant="ghost" size="sm" onClick={addBreak} className="w-auto self-start h-7 text-[10px] text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100 mt-1">
                                        + Another break
                                    </Button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 px-1">
                            <span className="bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground rounded-md uppercase tracking-wide">
                                Off
                            </span>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <div className="w-full sm:w-[100px] flex justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                    {hasChanged && isActive && (
                        <Button size="sm" onClick={handleApply} disabled={isSaving} className="h-9 w-full sm:w-auto shadow-sm transition-all animate-in fade-in zoom-in-95">
                            {isSaving ? <IconLoader2 className="animate-spin w-4 h-4 mr-1.5" /> : null}
                            Save
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
