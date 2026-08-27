"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconArrowLeft, IconCheck, IconLoader2, IconUser, IconCalendar, IconScissors } from "@tabler/icons-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";
import { Price } from "@/components/ui/price";

export default function NewBookingPage() {
    const router = useRouter();
    const profile = useQuery(api.users.getMyProfile);
    const orgId = profile?.orgId;

    // Data Queries
    const services = useQuery(api.services.listServices, orgId ? { orgId } : "skip");
    const staffMembers = useQuery(api.staff.listStaffMembers, orgId ? { orgId } : "skip");

    // Mutations
    const findOrCreateCustomer = useMutation(api.customers.findOrCreateCustomer);
    const createBooking = useMutation(api.bookings.createBooking);

    // Form State
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1: Customer
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    // Step 2: Service & Staff
    const [selectedServiceId, setSelectedServiceId] = useState<Id<"services"> | "">("");
    const [selectedStaffId, setSelectedStaffId] = useState<Id<"staff_members"> | "any">("any");

    // Step 3: Date & Time
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedSlotStartAt, setSelectedSlotStartAt] = useState<number | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dynamic slot queries based on selections
    const formattedMonth = selectedDate ? format(selectedDate, "yyyy-MM") : "";
    const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

    const availableDatesReq = orgId && selectedServiceId && selectedStaffId && formattedMonth ? {
        orgId,
        serviceId: selectedServiceId as Id<"services">,
        staffId: selectedStaffId,
        month: formattedMonth
    } : "skip";

    const availableDatesResponse = useQuery(api.slots.getAvailableDates, availableDatesReq);

    const availableSlotsReq = orgId && selectedServiceId && selectedStaffId && formattedDate ? {
        orgId,
        serviceId: selectedServiceId as Id<"services">,
        staffId: selectedStaffId,
        date: formattedDate
    } : "skip";

    const availableSlots = useQuery(api.slots.getAvailableSlots, availableSlotsReq);

    // Validation
    const isStep1Valid = customerName.length > 0 && (customerEmail.length > 0 || customerPhone.length > 0);
    const isStep2Valid = !!selectedServiceId && !!selectedStaffId;
    const isStep3Valid = !!selectedSlotStartAt;

    // Helpers
    const selectedService = services?.find(s => s._id === selectedServiceId);

    // Filter staff list based on the chosen service's allowed staffIds
    const allowedStaff = useMemo(() => {
        if (!staffMembers || !selectedService) return [];
        return staffMembers.filter(staff => selectedService.staffIds.includes(staff._id));
    }, [staffMembers, selectedService]);

    const handleNextStep = () => {
        if (step === 1 && isStep1Valid) setStep(2);
        if (step === 2 && isStep2Valid) setStep(3);
    };

    const handleCreateBooking = async () => {
        if (!orgId || !selectedServiceId || !selectedSlotStartAt || !isStep1Valid) return;

        setIsSubmitting(true);
        try {
            // 1. Get or create customer natively
            const customerId = await findOrCreateCustomer({
                orgId,
                name: customerName,
                email: customerEmail || undefined,
                phone: customerPhone || undefined,
            });

            // 2. Identify the specific staff member (if "any" was picked, resolve from the slot)
            let finalStaffId = selectedStaffId;
            if (finalStaffId === "any") {
                const theSlot = availableSlots?.find(s => s.startAt === selectedSlotStartAt);
                if (theSlot && theSlot.availableStaffIds && theSlot.availableStaffIds.length > 0) {
                    finalStaffId = theSlot.availableStaffIds[0]; // pick the first available staff randomly
                } else {
                    throw new Error("Could not resolve a staff member for this time slot.");
                }
            }

            // 3. Create actual booking
            await createBooking({
                orgId,
                customerId,
                serviceId: selectedServiceId as Id<"services">,
                staffId: finalStaffId as Id<"staff_members">,
                startAt: selectedSlotStartAt,
                source: "manual"
            });

            toast.success("Booking created successfully!");
            router.push("/beauty/bookings"); // back to list
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to create booking.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
            <div className="flex items-center gap-4">
                <Link href="/beauty/bookings">
                    <Button variant="outline" size="icon">
                        <IconArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        Manual Booking
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Create an appointment for a walk-in or phone customer.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left Side: Form Steps */}
                <div className="col-span-2 space-y-6">
                    {/* STEP 1: CUSTOMER */}
                    <Card className={`transition-opacity duration-300 ${step !== 1 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                                Customer Details
                            </CardTitle>
                            <CardDescription>Search or enter details for a new customer.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name *</Label>
                                <Input
                                    placeholder="John Doe"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input
                                        placeholder="+447..."
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        placeholder="john@example.com"
                                        value={customerEmail}
                                        onChange={e => setCustomerEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">Either Phone or Email is required to securely identify the customer.</p>
                            {step === 1 && (
                                <div className="pt-4 flex justify-end">
                                    <Button onClick={handleNextStep} disabled={!isStep1Valid}>Next Step</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* STEP 2: SERVICE & STAFF */}
                    <Card className={`transition-opacity duration-300 ${step !== 2 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                                Treatment & Assignee
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Service</Label>
                                <Select
                                    value={selectedServiceId}
                                    onValueChange={(val) => {
                                        setSelectedServiceId(val as Id<"services">);
                                        setSelectedStaffId("any"); // Reset staff when service changes
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a service..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {!services && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                                        {services?.map(s => (
                                            <SelectItem key={s._id} value={s._id}>
                                                {s.name} - <Price amount={s.priceMinorUnits} /> ({s.durationMins}m)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedServiceId && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>Select Professional (Optional)</Label>
                                    <Select
                                        value={selectedStaffId}
                                        onValueChange={(val) => setSelectedStaffId(val as Id<"staff_members"> | "any")}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Anyone Available" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="any">Anyone Available</SelectItem>
                                            {allowedStaff.map(s => (
                                                <SelectItem key={s._id} value={s._id}>
                                                    {s.displayName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="pt-4 flex justify-between">
                                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                                    <Button onClick={handleNextStep} disabled={!isStep2Valid}>View Schedule</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* STEP 3: DATE & TIME */}
                    <Card className={`transition-opacity duration-300 ${step !== 3 ? 'opacity-50 pointer-events-none' : ''}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                                Schedule Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-8">
                                <div>
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(d) => {
                                            if (d) {
                                                setSelectedDate(d);
                                                setSelectedSlotStartAt(null);
                                            }
                                        }}
                                        disabled={(date) => {
                                            // Disable past dates visually
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            if (date < today) return true;

                                            // Optionally integrate with availableDatesResponse here to disable fully booked days
                                            const dStr = format(date, "yyyy-MM-dd");
                                            if (availableDatesResponse && Array.isArray(availableDatesResponse)) {
                                                if (!availableDatesResponse.includes(dStr) && date >= today) {
                                                    return true;
                                                }
                                            }
                                            return false;
                                        }}
                                        initialFocus
                                    />
                                </div>
                                <div className="flex-1 border rounded-md p-4 bg-neutral-50 dark:bg-neutral-900 shadow-inner">
                                    <h4 className="font-medium text-sm text-center mb-4 text-muted-foreground">{selectedDate ? format(selectedDate, 'EEEE, MMMM do') : 'Select a date'}</h4>

                                    {!selectedServiceId ? (
                                        <p className="text-sm text-center text-muted-foreground mt-10">Please select a service first.</p>
                                    ) : availableSlots === undefined ? (
                                        <div className="flex justify-center items-center h-40">
                                            <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : availableSlots.length === 0 ? (
                                        <p className="text-sm text-center text-muted-foreground mt-10 text-orange-600">No availability for this date.</p>
                                    ) : (
                                        <ScrollArea className="h-64 pr-4">
                                            <div className="grid grid-cols-2 gap-2">
                                                {availableSlots.map((slot) => {
                                                    const d = new Date(slot.startAt);
                                                    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                                    const isSelected = selectedSlotStartAt === slot.startAt;

                                                    return (
                                                        <Button
                                                            key={slot.startAt}
                                                            variant={isSelected ? "default" : "outline"}
                                                            className={`justify-start relative ${slot.surgePriceApplied ? 'border-primary/50' : ''}`}
                                                            onClick={() => setSelectedSlotStartAt(slot.startAt)}
                                                        >
                                                            {timeStr}
                                                            {slot.surgePriceApplied && (
                                                                <span className="absolute top-1 right-1 flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                                </span>
                                                            )}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </div>
                            </div>

                            {step === 3 && (
                                <div className="pt-6 flex justify-between border-t mt-6">
                                    <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                                    <Button onClick={handleCreateBooking} disabled={!isStep3Valid || isSubmitting} size="lg">
                                        {isSubmitting ? <IconLoader2 className="h-4 w-4 mr-2 animate-spin" /> : <IconCheck className="h-4 w-4 mr-2" />}
                                        Finalize & Book
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Summary Sticky Sidebar */}
                <div className="col-span-1 border rounded-xl bg-card shadow-sm sticky top-6 overflow-hidden">
                    <div className="bg-primary/5 p-4 border-b border-primary/10">
                        <h3 className="font-semibold px-2 py-1">Booking Summary</h3>
                    </div>
                    <div className="p-6 space-y-6 text-sm">

                        {/* Customer Summary */}
                        <div className="flex gap-3 items-start">
                            <div className="bg-secondary p-2 rounded-full text-secondary-foreground"><IconUser className="w-4 h-4" /></div>
                            <div>
                                <p className="font-medium">{customerName || "Customer Name"}</p>
                                <p className="text-muted-foreground">{customerPhone || "No Phone"}</p>
                                <p className="text-muted-foreground text-xs">{customerEmail}</p>
                            </div>
                        </div>

                        {/* Service Summary */}
                        <div className="flex gap-3 items-start">
                            <div className="bg-secondary p-2 rounded-full text-secondary-foreground"><IconScissors className="w-4 h-4" /></div>
                            <div>
                                <p className="font-medium">{selectedService ? selectedService.name : "Select a service"}</p>
                                <p className="text-muted-foreground">
                                    {selectedStaffId === "any" ? "Any available professional" :
                                        staffMembers?.find(s => s._id === selectedStaffId)?.displayName || "Unassigned"}
                                </p>
                                {selectedService && (
                                    <p className="text-muted-foreground text-xs">{selectedService.durationMins} minutes</p>
                                )}
                            </div>
                        </div>

                        {/* Schedule Summary */}
                        <div className="flex gap-3 items-start">
                            <div className="bg-secondary p-2 rounded-full text-secondary-foreground"><IconCalendar className="w-4 h-4" /></div>
                            <div>
                                <p className="font-medium">
                                    {selectedDate ? format(selectedDate, 'EEEE, MMM do yyyy') : "TBD"}
                                </p>
                                <p className="text-muted-foreground font-semibold">
                                    {selectedSlotStartAt ? (
                                        `${new Date(selectedSlotStartAt).getHours().toString().padStart(2, '0')}:${new Date(selectedSlotStartAt).getMinutes().toString().padStart(2, '0')}`
                                    ) : (
                                        "Select a time"
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 border-t mt-6">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total Price</span>
                                <span>
                                    {selectedService ? (
                                        <span>
                                            {selectedSlotStartAt
                                                ? <Price amount={availableSlots?.find(s => s.startAt === selectedSlotStartAt)?.priceMinorUnits || selectedService.priceMinorUnits} />
                                                : <span className="flex items-center gap-1">~<Price amount={selectedService.priceMinorUnits} /></span>
                                            }
                                        </span>
                                    ) : (
                                        "—"
                                    )}
                                </span>
                            </div>
                            {selectedSlotStartAt && availableSlots?.find(s => s.startAt === selectedSlotStartAt)?.surgePriceApplied && (
                                <p className="text-xs text-primary mt-1 text-right">Surge pricing applied</p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
