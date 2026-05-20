import { useState } from "react";
import { useMutation } from "convex/react";
import { api, ADMIN_KEY } from "../lib/convex";

type ReviewStatus = "needs_review" | "in_progress" | "ready";
type VenueType = "restaurant" | "cafe" | "bar" | "club" | "hotel";
type PriceRange = "budget" | "mid" | "premium";

interface Org {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  phone?: string;
  websiteUrl?: string;
  venueType?: VenueType;
  cuisine?: string[];
  tags?: string[];
  priceRange?: PriceRange;
  openingHours?: Array<{ dayOfWeek: number; open: string; close: string; isClosed: boolean }>;
  menuText?: string;
  reviewStatus?: ReviewStatus;
  reviewerNotes?: string;
  coordinates?: { lat: number; lng: number };
  photoCount: number;
  listingStatus?: string;
  googlePlaceId?: string;
  woltSlug?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_HOURS = DAYS.map((_, i) => ({
  dayOfWeek: i,
  open: "09:00",
  close: "22:00",
  isClosed: false,
}));

interface Props {
  org: Org;
  onClose: () => void;
  onSaved: () => void;
}

export function PlaceDetailDrawer({ org, onClose, onSaved }: Props) {
  const update = useMutation(api.marketplace.scraped.updateScrapedOrg);
  const publish = useMutation(api.marketplace.scraped.setScrapedOrgPublished);

  const [name, setName] = useState(org.name);
  const [address, setAddress] = useState(org.address ?? "");
  const [phone, setPhone] = useState(org.phone ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(org.websiteUrl ?? "");
  const [venueType, setVenueType] = useState<VenueType | "">(org.venueType ?? "");
  const [cuisine, setCuisine] = useState((org.cuisine ?? []).join(", "));
  const [tags, setTags] = useState((org.tags ?? []).join(", "));
  const [priceRange, setPriceRange] = useState<PriceRange | "">(org.priceRange ?? "");
  const [menuText, setMenuText] = useState(org.menuText ?? "");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(org.reviewStatus ?? "needs_review");
  const [reviewerNotes, setReviewerNotes] = useState(org.reviewerNotes ?? "");
  const [hours, setHours] = useState(
    org.openingHours ?? DEFAULT_HOURS,
  );
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const csvToArr = (s: string) =>
    s.split(",").map((x) => x.trim()).filter(Boolean);

  async function handleSave() {
    setSaving(true);
    try {
      await update({
        adminKey: ADMIN_KEY,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: org._id as any,
        patch: {
          name,
          address: address || undefined,
          phone: phone || undefined,
          websiteUrl: websiteUrl || undefined,
          venueType: venueType || undefined,
          cuisine: cuisine ? csvToArr(cuisine) : undefined,
          tags: tags ? csvToArr(tags) : undefined,
          priceRange: priceRange || undefined,
          openingHours: hours,
          menuText: menuText || undefined,
          reviewStatus,
          reviewerNotes: reviewerNotes || undefined,
        },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!confirm(`Publish "${org.name}" to opus-mk? This will embed it into the RAG index.`)) return;
    setPublishing(true);
    try {
      await publish({ adminKey: ADMIN_KEY, id: org._id as any });
      onSaved();
      onClose();
    } finally {
      setPublishing(false);
    }
  }

  function updateHour(
    idx: number,
    field: "open" | "close" | "isClosed",
    value: string | boolean,
  ) {
    setHours((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)),
    );
  }

  function copyToAllDays(idx: number) {
    const source = hours[idx];
    setHours((prev) =>
      prev.map((h) => ({ ...h, open: source.open, close: source.close, isClosed: source.isClosed })),
    );
  }

  const s: Record<string, React.CSSProperties> = {
    overlay: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100,
      display: "flex", justifyContent: "flex-end",
    },
    drawer: {
      width: 520, background: "#fff", overflowY: "auto", padding: 20,
      display: "flex", flexDirection: "column", gap: 14,
      boxShadow: "-4px 0 16px rgba(0,0,0,0.15)",
    },
    row: { display: "flex", flexDirection: "column", gap: 4 },
    label: { fontWeight: 600, fontSize: 11, color: "#555" },
    actions: { display: "flex", gap: 8, marginTop: 8 },
    saveBtn: { background: "#2563eb", color: "#fff", padding: "6px 16px" },
    publishBtn: { background: "#16a34a", color: "#fff", padding: "6px 16px" },
    closeBtn: { background: "#e5e7eb", color: "#374151", padding: "6px 14px" },
    hoursGrid: {
      display: "grid",
      gridTemplateColumns: "40px 1fr 1fr 60px 40px",
      gap: "4px 8px",
      alignItems: "center",
      fontSize: 12,
    },
    hrHeader: { fontWeight: 700, fontSize: 11, color: "#555" },
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.drawer}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 15 }}>{org.name}</strong>
          <button style={s.closeBtn} onClick={onClose}>✕ Close</button>
        </div>

        <div style={{ fontSize: 11, color: "#888", display: "flex", gap: 12 }}>
          {org.googlePlaceId && <span>Google: {org.googlePlaceId.slice(0, 20)}…</span>}
          {org.woltSlug && <span>Wolt: {org.woltSlug}</span>}
          <span>Photos: {org.photoCount}</span>
          {org.listingStatus && <span>Status: {org.listingStatus}</span>}
        </div>

        <div style={s.row}>
          <label style={s.label}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={s.row}>
          <label style={s.label}>Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={s.row}>
            <label style={s.label}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div style={s.row}>
            <label style={s.label}>Website</label>
            <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={s.row}>
            <label style={s.label}>Venue type</label>
            <select value={venueType} onChange={(e) => setVenueType(e.target.value as VenueType)}>
              <option value="">— select —</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Cafe</option>
              <option value="bar">Bar</option>
              <option value="club">Club</option>
              <option value="hotel">Hotel</option>
            </select>
          </div>
          <div style={s.row}>
            <label style={s.label}>Price range</label>
            <select value={priceRange} onChange={(e) => setPriceRange(e.target.value as PriceRange)}>
              <option value="">— select —</option>
              <option value="budget">Budget (&lt;500 MKD avg)</option>
              <option value="mid">Mid (500–1500 MKD)</option>
              <option value="premium">Premium (&gt;1500 MKD)</option>
            </select>
          </div>
        </div>

        <div style={s.row}>
          <label style={s.label}>Cuisine (comma-separated)</label>
          <input value={cuisine} onChange={(e) => setCuisine(e.target.value)}
            placeholder="Macedonian, Grill, Vegan-friendly" />
        </div>

        <div style={s.row}>
          <label style={s.label}>Tags (comma-separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="outdoor seating, live music, family-friendly" />
        </div>

        <div style={s.row}>
          <label style={s.label}>Opening hours</label>
          <div style={s.hoursGrid}>
            <span style={s.hrHeader}>Day</span>
            <span style={s.hrHeader}>Open</span>
            <span style={s.hrHeader}>Close</span>
            <span style={s.hrHeader}>Closed?</span>
            <span />
            {(hours.length === 7 ? hours : DEFAULT_HOURS).map((h, idx) => (
              <>
                <span key={`d-${idx}`} style={{ fontWeight: 600 }}>{DAYS[idx]}</span>
                <input
                  key={`o-${idx}`}
                  type="time"
                  value={h.open}
                  disabled={h.isClosed}
                  onChange={(e) => updateHour(idx, "open", e.target.value)}
                />
                <input
                  key={`c-${idx}`}
                  type="time"
                  value={h.close}
                  disabled={h.isClosed}
                  onChange={(e) => updateHour(idx, "close", e.target.value)}
                />
                <input
                  key={`cl-${idx}`}
                  type="checkbox"
                  checked={h.isClosed}
                  style={{ width: "auto" }}
                  onChange={(e) => updateHour(idx, "isClosed", e.target.checked)}
                />
                <button
                  key={`cp-${idx}`}
                  title="Copy to all days"
                  onClick={() => copyToAllDays(idx)}
                  style={{
                    fontSize: 13, padding: "1px 4px", cursor: "pointer",
                    background: "transparent", border: "1px solid #d1d5db",
                    borderRadius: 4, color: "#6b7280", lineHeight: 1.4,
                  }}
                >
                  ↓
                </button>
              </>
            ))}
          </div>
        </div>

        <div style={s.row}>
          <label style={s.label}>Menu (markdown)</label>
          <textarea
            value={menuText}
            onChange={(e) => setMenuText(e.target.value)}
            rows={10}
            placeholder={"## Mains\n- Kebap (350 MKD) — grilled minced beef\n\n## Salads\n- Shopska (200 MKD)"}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={s.row}>
            <label style={s.label}>Review status</label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
            >
              <option value="needs_review">Needs review</option>
              <option value="in_progress">In progress</option>
              <option value="ready">Ready</option>
            </select>
          </div>
        </div>

        <div style={s.row}>
          <label style={s.label}>Reviewer notes</label>
          <textarea
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div style={s.actions}>
          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {reviewStatus === "ready" && org.listingStatus !== "published" && (
            <button style={s.publishBtn} onClick={handlePublish} disabled={publishing}>
              {publishing ? "Publishing…" : "Publish to opus-mk"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
