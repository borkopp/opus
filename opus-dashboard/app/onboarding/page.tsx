"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
    Scissors, UtensilsCrossed, Check, ArrowRight, ArrowLeft,
    MapPin, Clock, Sparkles, User, Building2, Globe,
    Upload, X, ImageIcon
} from "lucide-react";
import { Logo } from "@/components/Logo";

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────
type Industry = "beauty_wellness" | "hospitality";
type VenueType = "restaurant" | "cafe" | "bar" | "club" | "hotel";

interface FormState {
    // Step 0
    industry: Industry | null;
    // Step 1
    name: string;
    logoUrl: string;
    // Step 2 — shared
    address: string;
    city: string;
    neighborhood: string;
    coordinates: { lat: number; lng: number } | null;
    // Step 2 — hospitality specific
    venueType: VenueType | null;
    cuisine: string[];
    // Step 3
    openingHours: { dayOfWeek: number; open: string; close: string; isClosed: boolean }[];
    // Step 4 — beauty: profile
    tagline: string;
    bio: string;
    coverMedia: { storageId: string; name: string } | null;
    galleryMedia: { storageId: string; name: string }[];
    // Step 4 — hospitality: reservation settings (inline)
    maxPartySize: number;
    defaultDurationMins: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_HOURS = DAYS.map((_, i) => ({
    dayOfWeek: i,
    open: "09:00",
    close: "21:00",
    isClosed: i === 6, // Sunday closed by default
}));

const CUISINE_TAGS = [
    "Macedonian", "Mediterranean", "Grill/BBQ", "Pizza", "Burgers", "Sushi",
    "Vegan-friendly", "Vegetarian", "Seafood", "Asian", "Cafe", "Brunch",
];

const BEAUTY_STEPS = ["Industry", "Business", "Location", "Hours", "Profile"];
const HOSP_STEPS = ["Industry", "Venue", "Location", "Hours", "Setup"];

// ─────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-sm font-medium text-neutral-300 mb-1.5">{children}</label>;
}

function TextInput({ className, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            {...props}
            className={cn(
                "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition",
                className
            )}
        />
    );
}

function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <textarea
            {...props}
            className={cn(
                "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition resize-y min-h-[100px]",
                className
            )}
        />
    );
}

function ImageUploader({ 
    label, 
    multiple, 
    files, 
    onChange 
}: { 
    label: React.ReactNode, 
    multiple?: boolean, 
    files: { storageId: string, name: string }[], 
    onChange: (f: { storageId: string, name: string }[]) => void 
}) {
    const generateUploadUrl = useMutation(api.orgMedia.generateUploadUrl);
    const [uploading, setUploading] = useState(false);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return;
        setUploading(true);
        try {
            const newFiles = [];
            for (const file of Array.from(e.target.files)) {
                const postUrl = await generateUploadUrl();
                const res = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: file,
                });
                const { storageId } = await res.json();
                newFiles.push({
                    storageId,
                    name: file.name
                });
            }
            if (multiple) {
                onChange([...files, ...newFiles]);
            } else {
                onChange([newFiles[0]]);
            }
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    return (
        <div className="space-y-1.5">
            <FieldLabel>{label}</FieldLabel>
            {files.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 p-2 rounded-xl group transition hover:bg-white/10">
                            <div className="flex items-center gap-3 overflow-hidden ml-1">
                                <div className="h-8 w-8 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0">
                                    <ImageIcon size={14} className="text-indigo-400" />
                                </div>
                                <span className="text-sm text-neutral-300 truncate font-medium">{f.name}</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                                className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            {(!files.length || multiple) && (
                <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-white/5 transition rounded-xl cursor-pointer">
                    <input type="file" className="hidden" multiple={multiple} accept="image/*" onChange={handleFile} disabled={uploading} />
                    <span className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                        {uploading ? <div className="h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/> : <Upload size={16} />}
                        {uploading ? "Uploading safely to database..." : "Click to attach photo"}
                    </span>
                </label>
            )}
        </div>
    );
}

function SelectInput({ className, children, ...props }: React.ComponentProps<"select">) {
    return (
        <select
            {...props}
            className={cn(
                "w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-white",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 transition",
                className
            )}
        >
            {children}
        </select>
    );
}

function PrimaryBtn({ children, disabled, onClick, type = "button", className }: {
    children: React.ReactNode; disabled?: boolean; onClick?: () => void;
    type?: "button" | "submit"; className?: string;
}) {
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition active:scale-[0.98]",
                "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed",
                className
            )}
        >
            {children}
        </button>
    );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition"
        >
            {children}
        </button>
    );
}

// ─────────────────────────────────────────────────────
// Step progress bar
// ─────────────────────────────────────────────────────
function StepBar({ step, labels }: { step: number; labels: string[] }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {labels.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border transition-all",
                        i < step
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : i === step
                                ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                                : "border-white/10 text-neutral-600 bg-transparent"
                    )}>
                        {i < step ? <Check size={12} /> : i + 1}
                    </div>
                    <span className={cn("text-xs hidden sm:block", i === step ? "text-white" : "text-neutral-600")}>
                        {label}
                    </span>
                    {i < labels.length - 1 && (
                        <div className={cn("h-px w-6 mx-1 hidden sm:block", i < step ? "bg-indigo-600" : "bg-white/10")} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────
// STEP 0 — Industry Picker
// ─────────────────────────────────────────────────────
function StepIndustry({ value, onChange }: {
    value: Industry | null;
    onChange: (v: Industry) => void;
}) {
    const options: { id: Industry; icon: React.ReactNode; title: string; desc: string; features: string[] }[] = [
        {
            id: "beauty_wellness",
            icon: <Scissors size={28} />,
            title: "Beauty & Wellness",
            desc: "Barbershops, salons, spas, nail studios, personal trainers",
            features: ["Staff scheduling", "Online booking", "AI front desk", "Deposits & payouts"],
        },
        {
            id: "hospitality",
            icon: <UtensilsCrossed size={28} />,
            title: "Hospitality",
            desc: "Restaurants, cafes, bars, clubs, hotels",
            features: ["Table reservations", "Floor plan builder", "Service periods", "Walk-in management"],
        },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold text-white">Choose your industry</h2>
                <p className="mt-1 text-sm text-neutral-400">This determines which features and onboarding flow you'll get.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-6">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange(opt.id)}
                        className={cn(
                            "relative text-left rounded-2xl border p-5 transition-all hover:border-indigo-500/60",
                            value === opt.id
                                ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50"
                                : "border-white/10 bg-white/5"
                        )}
                    >
                        {value === opt.id && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                <Check size={11} className="text-white" />
                            </div>
                        )}
                        <div className={cn("mb-3 text-neutral-400", value === opt.id && "text-indigo-400")}>
                            {opt.icon}
                        </div>
                        <h3 className="font-semibold text-white text-base">{opt.title}</h3>
                        <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{opt.desc}</p>
                        <ul className="mt-3 space-y-1">
                            {opt.features.map((f) => (
                                <li key={f} className="flex items-center gap-1.5 text-xs text-neutral-500">
                                    <Check size={10} className="text-indigo-500 flex-shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────
// STEP 1 — Business Identity
// ─────────────────────────────────────────────────────
function StepIdentity({ form, set }: { form: FormState; set: (k: keyof FormState, v: any) => void }) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-white">
                    {form.industry === "hospitality" ? "Your venue" : "Your business"}
                </h2>
                <p className="mt-1 text-sm text-neutral-400">This is how you'll appear on opus.mk and your booking page.</p>
            </div>

            <div>
                <FieldLabel>{form.industry === "hospitality" ? "Venue name" : "Business name"}</FieldLabel>
                <TextInput
                    required
                    placeholder={form.industry === "hospitality" ? "e.g. Basta Restaurant" : "e.g. King Cuts Barbershop"}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                />
            </div>

            {form.industry === "hospitality" && (
                <div>
                    <FieldLabel>Venue type</FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-0.5">
                        {(["restaurant", "cafe", "bar", "club", "hotel"] as VenueType[]).map((vt) => (
                            <button
                                key={vt}
                                type="button"
                                onClick={() => set("venueType", vt)}
                                className={cn(
                                    "rounded-xl border py-2 px-3 text-sm capitalize transition",
                                    form.venueType === vt
                                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                                        : "border-white/10 bg-white/5 text-neutral-400 hover:border-white/25"
                                )}
                            >
                                {vt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {form.industry === "hospitality" && (
                <div>
                    <FieldLabel>Cuisine / category tags</FieldLabel>
                    <div className="flex flex-wrap gap-2 mt-0.5">
                        {CUISINE_TAGS.map((tag) => {
                            const active = form.cuisine.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() =>
                                        set("cuisine", active
                                            ? form.cuisine.filter((c) => c !== tag)
                                            : [...form.cuisine, tag])
                                    }
                                    className={cn(
                                        "rounded-full border px-3 py-1 text-xs transition",
                                        active
                                            ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                                            : "border-white/10 bg-white/5 text-neutral-400 hover:border-white/25"
                                    )}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────
// STEP 2 — Location
// ─────────────────────────────────────────────────────
function StepLocation({ form, set }: { form: FormState; set: (k: keyof FormState, v: any) => void }) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-white">Location</h2>
                <p className="mt-1 text-sm text-neutral-400">
                    Customers on opus.mk will use this to find you. A map picker will be available to pin your exact location.
                </p>
            </div>

            <div>
                <FieldLabel>City</FieldLabel>
                <TextInput
                    placeholder="Skopje"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                />
            </div>

            <div>
                <FieldLabel>Address</FieldLabel>
                <TextInput
                    placeholder="ul. Makedonija 12"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                />
            </div>

            <div>
                <FieldLabel>Neighborhood / area (optional)</FieldLabel>
                <TextInput
                    placeholder="Centar, Karpoš, Aerodrom…"
                    value={form.neighborhood}
                    onChange={(e) => set("neighborhood", e.target.value)}
                />
            </div>

            {/* Mapbox picker placeholder — wire up when Mapbox token is available */}
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-6 flex flex-col items-center justify-center gap-2 text-center">
                <MapPin size={24} className="text-neutral-600" />
                <p className="text-sm text-neutral-500">Interactive map picker</p>
                <p className="text-xs text-neutral-600">Add your Mapbox token in <code className="bg-white/5 px-1 rounded">.env.local</code> to enable</p>
                <p className="text-xs text-neutral-600 mt-1">
                    <code className="bg-white/5 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code>
                </p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────
// STEP 3 — Opening Hours
// ─────────────────────────────────────────────────────
function StepHours({ form, set }: { form: FormState; set: (k: keyof FormState, v: any) => void }) {
    const updateDay = (i: number, field: string, value: string | boolean) => {
        const updated = form.openingHours.map((d, idx) =>
            idx === i ? { ...d, [field]: value } : d
        );
        set("openingHours", updated);
    };

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-white">Opening hours</h2>
                <p className="mt-1 text-sm text-neutral-400">
                    Shown on your opus.mk listing. You can always update these in Settings.
                </p>
            </div>

            <div className="space-y-2">
                {form.openingHours.map((day, i) => (
                    <div key={i} className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3 transition",
                        day.isClosed ? "border-white/5 bg-white/3 opacity-60" : "border-white/10 bg-white/5"
                    )}>
                        <div className="w-10 text-sm font-medium text-neutral-400 flex-shrink-0">
                            {DAYS[i]}
                        </div>
                        <button
                            type="button"
                            onClick={() => updateDay(i, "isClosed", !day.isClosed)}
                            className={cn(
                                "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
                                !day.isClosed ? "bg-indigo-600" : "bg-neutral-700"
                            )}
                        >
                            <span className={cn(
                                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                                !day.isClosed ? "left-[18px]" : "left-0.5"
                            )} />
                        </button>
                        {day.isClosed ? (
                            <span className="text-sm text-neutral-600">Closed</span>
                        ) : (
                            <div className="flex items-center gap-2 flex-1">
                                <input
                                    type="time"
                                    value={day.open}
                                    onChange={(e) => updateDay(i, "open", e.target.value)}
                                    className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <span className="text-neutral-600 text-xs">to</span>
                                <input
                                    type="time"
                                    value={day.close}
                                    onChange={(e) => updateDay(i, "close", e.target.value)}
                                    className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────
// STEP 4 — Beauty: Profile
// ─────────────────────────────────────────────────────
function StepBeautyProfile({ form, set }: { form: FormState; set: (k: keyof FormState, v: any) => void }) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-white">Create your profile</h2>
                <p className="mt-1 text-sm text-neutral-400">
                    Introduce your business with a tagline, bio, and some photos.
                </p>
            </div>

            <div>
                <FieldLabel>Tagline / Slogan</FieldLabel>
                <TextInput
                    placeholder="e.g. Premium haircuts & wet shaves"
                    value={form.tagline}
                    onChange={(e) => set("tagline", e.target.value)}
                />
            </div>

            <div>
                <FieldLabel>Bio / About Us</FieldLabel>
                <TextArea
                    placeholder="Tell customers about your business..."
                    value={form.bio}
                    onChange={(e) => set("bio", e.target.value)}
                />
            </div>

            <div>
                <ImageUploader 
                    label="Cover Photo (Main profile banner)"
                    multiple={false}
                    files={form.coverMedia ? [form.coverMedia] : []}
                    onChange={(files) => set("coverMedia", files[0] || null)}
                />
            </div>

            <div>
                <ImageUploader 
                    label="Gallery Photos (Showcase your work)"
                    multiple={true}
                    files={form.galleryMedia}
                    onChange={(files) => set("galleryMedia", files)}
                />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────
// STEP 4 — Hospitality: Reservation Setup
// ─────────────────────────────────────────────────────
function StepHospSetup({ form, set }: { form: FormState; set: (k: keyof FormState, v: any) => void }) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-white">Reservation settings</h2>
                <p className="mt-1 text-sm text-neutral-400">
                    Default rules for how bookings work. You can fine-tune everything in Settings.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <FieldLabel>Max party size</FieldLabel>
                    <SelectInput
                        value={form.maxPartySize}
                        onChange={(e) => set("maxPartySize", Number(e.target.value))}
                    >
                        {[2, 4, 6, 8, 10, 12, 15, 20, 30, 50].map((n) => (
                            <option key={n} value={n}>{n} guests</option>
                        ))}
                    </SelectInput>
                </div>
                <div>
                    <FieldLabel>Default reservation length</FieldLabel>
                    <SelectInput
                        value={form.defaultDurationMins}
                        onChange={(e) => set("defaultDurationMins", Number(e.target.value))}
                    >
                        {[60, 75, 90, 105, 120, 150, 180, 240].map((d) => (
                            <option key={d} value={d}>{d} min</option>
                        ))}
                    </SelectInput>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/3 p-4 text-sm text-neutral-400 flex gap-3">
                <Building2 size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>After onboarding, you'll design your floor plan and add your tables. The system will auto-assign the best table for each party size.</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────
// Completion screen
// ─────────────────────────────────────────────────────
function StepComplete({ industry }: { industry: Industry }) {
    const goLiveItems = [
        { icon: <Globe size={14} />, label: "Add cover photo & gallery", sublabel: "Makes your listing stand out" },
        { icon: <User size={14} />, label: "Write your business bio", sublabel: "Tell customers what makes you special" },
        { icon: <Sparkles size={14} />, label: "Add service descriptions", sublabel: "Consumer-facing copy for opus.mk" },
        { icon: <Check size={14} />, label: "Publish to opus.mk", sublabel: "Go live when you're ready" },
    ];

    return (
        <div className="space-y-6">
            <div className="text-center py-2">
                <div className="mx-auto w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
                    <Check size={24} className="text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">You're set up!</h2>
                <p className="mt-2 text-sm text-neutral-400">
                    Your {industry === "hospitality" ? "venue" : "business"} workspace is ready.
                    Complete the checklist below to go live on opus.mk.
                </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Go Live Checklist</p>
                {goLiveItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-neutral-500 flex-shrink-0">
                            {item.icon}
                        </div>
                        <div>
                            <p className="text-sm text-neutral-300">{item.label}</p>
                            <p className="text-xs text-neutral-600">{item.sublabel}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────
// Persistence helpers
// ─────────────────────────────────────────────────────
const LS_KEY = "opus_onboarding_v1";

function saveProgress(data: { orgId: string; step: number; industry: Industry }) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

function loadProgress(): { orgId: string; step: number; industry: Industry } | null {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
}

function clearProgress() {
    try { localStorage.removeItem(LS_KEY); } catch {}
}

// ─────────────────────────────────────────────────────
// MAIN — Onboarding page
// ─────────────────────────────────────────────────────
export default function Onboarding() {
    const { isLoaded, isSignedIn } = useUser();
    const createOrg = useMutation(api.orgs.createOrg);
    const updateProfile = useMutation(api.orgs.updateProfile);
    const addMedia = useMutation(api.orgMedia.addMedia);
    const saveReservationSettings = useMutation(api.hospitality.reservationSettings.createOrUpdateReservationSettings);
    const router = useRouter();

    const [step, setStep] = useState(0);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [resumeChecked, setResumeChecked] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState<FormState>({
        industry: null,
        name: "",
        logoUrl: "",
        address: "",
        city: "",
        neighborhood: "",
        coordinates: null,
        venueType: null,
        cuisine: [],
        openingHours: DEFAULT_HOURS,
        tagline: "",
        bio: "",
        coverMedia: null,
        galleryMedia: [],
        maxPartySize: 10,
        defaultDurationMins: 90,
    });

    const set = (k: keyof FormState, v: any) => setForm((f) => ({ ...f, [k]: v }));

    // ── Resume from localStorage on mount ──────────────
    // We use the getOnboardingOrg query reactively: first we load saved data from
    // localStorage, store the orgId in state, and let the query verify it.
    const profile = useQuery(api.users.getMyProfile);
    const saved = resumeChecked ? null : loadProgress();
    const resolvedOrgId = (profile?.orgId || saved?.orgId) as any ?? null;

    // Subscribes to the specific org either from their current profile or their localstorage save
    const existingOrg = useQuery(
        api.orgs.getOnboardingOrg,
        resolvedOrgId ? { orgId: resolvedOrgId } : "skip"
    );

    // Protect onboarding boundary if complete
    useEffect(() => {
        if (existingOrg && existingOrg.isOnboardingComplete && step !== 5) {
            router.push("/");
        }
    }, [existingOrg, step, router]);

    // Once the query resolves, restore state
    if (!resumeChecked && isLoaded && profile !== undefined) {
        if ((saved || profile?.orgId) && existingOrg !== undefined) {
            // Query resolved (either found or null)
            setResumeChecked(true);
            if (existingOrg) {
                // Org exists — restore progress
                setOrgId(existingOrg._id);
                setForm((f) => ({
                    ...f,
                    industry: existingOrg.industry as Industry,
                    name: existingOrg.name === "Untitled" ? "" : existingOrg.name,
                }));
                const resumeStep = Math.max(1, Math.min(existingOrg.onboardingStep, 4));
                setStep(resumeStep);
            } else {
                if (saved && !profile?.orgId) {
                    clearProgress();
                }
            }
        } else if (!saved && !profile?.orgId) {
            setResumeChecked(true);
        }
    }

    if (isLoaded && !isSignedIn) {
        router.push("/login");
        return null;
    }

    const stepLabels = form.industry === "hospitality" ? HOSP_STEPS : BEAUTY_STEPS;

    const canProceed = () => {
        if (step === 0) return !!form.industry;
        if (step === 1) return form.name.trim().length > 0;
        return true;
    };

    const handleNext = async () => {
        setError("");
        setIsLoading(true);

        try {
            // Step 0 → 1: industry selected — no DB call yet, just advance
            if (step === 0) {
                setStep(1);
                setIsLoading(false);
                return;
            }

            // Step 1 → 2: create org NOW with the real name the user typed
            if (step === 1) {
                let id = orgId;
                if (!id) {
                    id = await createOrg({ name: form.name.trim(), industry: form.industry! });
                    setOrgId(id);
                }
                // Always update profile to persist step 2 + any hospitality fields
                await updateProfile({
                    orgId: id as any,
                    name: form.name.trim(),
                    onboardingStep: 2,
                    ...(form.industry === "hospitality" && {
                        venueType: form.venueType ?? undefined,
                        cuisine: form.cuisine,
                    }),
                });
                saveProgress({ orgId: id!, step: 2, industry: form.industry! });
                setStep(2);
                setIsLoading(false);
                return;
            }

            // Step 2 → 3: save location
            if (step === 2 && orgId) {
                await updateProfile({
                    orgId: orgId as any,
                    address: form.address,
                    city: form.city,
                    neighborhood: form.neighborhood,
                    country: "MK",
                    onboardingStep: 3,
                });
                saveProgress({ orgId, step: 3, industry: form.industry! });
            }

            // Step 3 → 4: save opening hours
            if (step === 3 && orgId) {
                await updateProfile({
                    orgId: orgId as any,
                    openingHours: form.openingHours,
                    onboardingStep: 4,
                });
                saveProgress({ orgId, step: 4, industry: form.industry! });
            }

            // Step 4 → Complete
            if (step === 4 && orgId) {
                if (form.industry === "beauty_wellness") {
                    await updateProfile({
                        orgId: orgId as any,
                        tagline: form.tagline,
                        bio: form.bio,
                        onboardingStep: 5,
                        isOnboardingComplete: true,
                    });

                    if (form.coverMedia) {
                        await addMedia({
                            orgId: orgId as any,
                            storageId: form.coverMedia.storageId as any,
                            type: "cover",
                            sortOrder: 0,
                        });
                    }

                    if (form.galleryMedia.length > 0) {
                        for (let i = 0; i < form.galleryMedia.length; i++) {
                            await addMedia({
                                orgId: orgId as any,
                                storageId: form.galleryMedia[i].storageId as any,
                                type: "gallery",
                                sortOrder: i + 1,
                            });
                        }
                    }
                } else {
                    // Hospitality — save reservation settings with onboarding values + sensible defaults
                    await saveReservationSettings({
                        orgId: orgId as any,
                        bookingWindowDays: 60,
                        minAdvanceBookingHours: 2,
                        minPartySize: 1,
                        maxPartySize: form.maxPartySize,
                        defaultDurationMins: form.defaultDurationMins,
                        minDurationMins: 60,
                        maxDurationMins: 240,
                        slotIntervalMins: 15,
                        walkInsAccepted: true,
                        walkInBufferMins: 15,
                        depositRequired: false,
                        reminderHoursBefore: [24, 2],
                    });
                    await updateProfile({
                        orgId: orgId as any,
                        onboardingStep: 5,
                        isOnboardingComplete: true,
                    });
                }
                clearProgress();
                setStep(5);
                setIsLoading(false);
                return;
            }

            setStep((s) => s + 1);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinish = () => router.push("/");

    // Complete screen
    if (step === 5) {
        return (
            <OnboardingShell step={5} labels={stepLabels}>
                <StepComplete industry={form.industry!} />
                <div className="mt-8">
                    <PrimaryBtn onClick={handleFinish} className="w-full">
                        Go to dashboard <ArrowRight size={15} />
                    </PrimaryBtn>
                </div>
            </OnboardingShell>
        );
    }

    return (
        <OnboardingShell step={step} labels={stepLabels}>
            {step === 0 && <StepIndustry value={form.industry} onChange={(v) => set("industry", v)} />}
            {step === 1 && <StepIdentity form={form} set={set} />}
            {step === 2 && <StepLocation form={form} set={set} />}
            {step === 3 && <StepHours form={form} set={set} />}
            {step === 4 && form.industry === "beauty_wellness" && <StepBeautyProfile form={form} set={set} />}
            {step === 4 && form.industry === "hospitality" && <StepHospSetup form={form} set={set} />}

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            <div className="flex items-center justify-between mt-8">
                {step > 0 ? (
                    <GhostBtn onClick={() => setStep((s) => s - 1)}>
                        <ArrowLeft size={14} /> Back
                    </GhostBtn>
                ) : <div />}
                <PrimaryBtn
                    onClick={handleNext}
                    disabled={isLoading || !canProceed()}
                >
                    {isLoading ? "Saving…" : step === 4 ? "Finish setup" : "Continue"}
                    {!isLoading && <ArrowRight size={15} />}
                </PrimaryBtn>
            </div>
        </OnboardingShell>
    );
}


// ─────────────────────────────────────────────────────
// Layout shell with dark gradient background
// ─────────────────────────────────────────────────────
function OnboardingShell({ children, step, labels }: {
    children: React.ReactNode;
    step: number;
    labels: string[];
}) {
    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-3xl" />

            <div className="relative z-10 w-full max-w-3xl">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-8 text-white font-semibold text-lg">
                    <Logo className="text-3xl" />
                    <span className="text-3xl font-display font-bold">Onboarding</span>
                </div>

                {/* Card */}
                <div className="rounded-2xl w-full items-center justify-center border border-white/10 bg-neutral-950/80 backdrop-blur-md p-7 shadow-2xl">
                    {step < 5 && <StepBar step={step} labels={labels} />}
                    {children}
                </div>
            </div>
        </div>
    );
}
