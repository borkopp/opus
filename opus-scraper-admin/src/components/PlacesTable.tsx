import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api, ADMIN_KEY } from "../lib/convex";
import { CompletenessBadge } from "./CompletenessBadge";
import { PlaceDetailDrawer } from "./PlaceDetailDrawer";

type OrgRow = FunctionReturnType<typeof api.marketplace.scraped.listScrapedOrgs>[number];

type ReviewFilter = "needs_review" | "in_progress" | "ready" | undefined;
type MissingFilter = "openingHours" | "menuText" | "address" | "coordinates" | "phone" | undefined;

export function PlacesTable() {
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(undefined);
  const [missingFilter, setMissingFilter] = useState<MissingFilter>(undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<"marking" | "publishing" | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const bulkMarkReady = useMutation(api.marketplace.scraped.bulkMarkReady);
  const bulkPublishReady = useMutation(api.marketplace.scraped.bulkPublishReady);

  const orgs = useQuery(api.marketplace.scraped.listScrapedOrgs, {
    adminKey: ADMIN_KEY,
    reviewStatus: reviewFilter,
    missingField: missingFilter,
  });

  const stats = useQuery(api.marketplace.scraped.getScraperStats, {
    adminKey: ADMIN_KEY,
  });

  const selectedOrg = orgs?.find((o: { _id: string }) => o._id === selected) ?? null;

  function chipStyle(active: boolean): React.CSSProperties {
    return {
      padding: "4px 12px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      border: "1px solid #d1d5db",
      background: active ? "#2563eb" : "#fff",
      color: active ? "#fff" : "#374151",
      cursor: "pointer",
    };
  }

  function rowStyle(isSelected: boolean): React.CSSProperties {
    return { cursor: "pointer", background: isSelected ? "#eff6ff" : "transparent" };
  }

  const s: Record<string, React.CSSProperties> = {
    container: { padding: 16 },
    title: { fontSize: 18, fontWeight: 700, marginBottom: 12 },
    statsBar: {
      display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14,
      padding: 10, background: "#fff", borderRadius: 6,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    },
    stat: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 70 },
    statNum: { fontSize: 22, fontWeight: 700 },
    statLabel: { fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 },
    filters: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" },
    table: {
      width: "100%", borderCollapse: "collapse",
      background: "#fff", borderRadius: 8, overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    },
    th: {
      textAlign: "left", padding: "8px 10px", background: "#f9fafb",
      fontWeight: 700, fontSize: 11, color: "#6b7280", borderBottom: "1px solid #e5e7eb",
      textTransform: "uppercase", letterSpacing: 0.5,
    },
    td: { padding: "6px 10px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
    editBtn: {
      background: "#eff6ff", color: "#2563eb", padding: "2px 8px",
      fontSize: 11, fontWeight: 600,
    },
    publishedTag: {
      background: "#dcfce7", color: "#15803d", padding: "1px 6px",
      borderRadius: 10, fontSize: 11, fontWeight: 600,
    },
  };

  async function handleBulkMarkReady() {
    setBulkLoading("marking");
    setBulkResult(null);
    try {
      const { marked } = await bulkMarkReady({ adminKey: ADMIN_KEY });
      setBulkResult(`Marked ${marked} venue${marked !== 1 ? "s" : ""} as Ready.`);
    } catch (e) {
      setBulkResult(`Error: ${(e as Error).message}`);
    } finally {
      setBulkLoading(null);
    }
  }

  async function handleBulkPublish() {
    setBulkLoading("publishing");
    setBulkResult(null);
    try {
      const { published } = await bulkPublishReady({ adminKey: ADMIN_KEY });
      setBulkResult(`Published ${published} venue${published !== 1 ? "s" : ""} to opus-mk.`);
    } catch (e) {
      setBulkResult(`Error: ${(e as Error).message}`);
    } finally {
      setBulkLoading(null);
    }
  }

  return (
    <div style={s.container}>
      <div style={s.title}>Skopje Scraper Admin</div>

      {stats && (
        <div style={s.statsBar}>
          <div style={s.stat}>
            <span style={s.statNum}>{stats.total}</span>
            <span style={s.statLabel}>Total</span>
          </div>
          <div style={s.stat}>
            <span style={{ ...s.statNum, color: "#dc2626" }}>{stats.needs_review}</span>
            <span style={s.statLabel}>Needs review</span>
          </div>
          <div style={s.stat}>
            <span style={{ ...s.statNum, color: "#d97706" }}>{stats.in_progress}</span>
            <span style={s.statLabel}>In progress</span>
          </div>
          <div style={s.stat}>
            <span style={{ ...s.statNum, color: "#2563eb" }}>{stats.ready}</span>
            <span style={s.statLabel}>Ready</span>
          </div>
          <div style={s.stat}>
            <span style={{ ...s.statNum, color: "#16a34a" }}>{stats.published}</span>
            <span style={s.statLabel}>Published</span>
          </div>
          <div style={{ width: 1, background: "#e5e7eb", margin: "0 4px" }} />
          <div style={s.stat}>
            <span style={{ ...s.statNum, color: "#dc2626" }}>{stats.missingHours}</span>
            <span style={s.statLabel}>No hours</span>
          </div>
          <div style={s.stat}>
            <span style={{ ...s.statNum, color: "#dc2626" }}>{stats.missingMenu}</span>
            <span style={s.statLabel}>No menu</span>
          </div>
          <div style={s.stat}>
            <span style={{ ...s.statNum, color: "#d97706" }}>{stats.missingPhotos}</span>
            <span style={s.statLabel}>No photos</span>
          </div>
          <div style={s.stat}>
            <span style={{ ...s.statNum, color: "#d97706" }}>{stats.missingCoords}</span>
            <span style={s.statLabel}>No coords</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button
          style={{
            padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: bulkLoading === "marking" ? "#dbeafe" : "#2563eb",
            color: "#fff", border: "none", cursor: bulkLoading ? "not-allowed" : "pointer",
            opacity: bulkLoading ? 0.7 : 1,
          }}
          onClick={handleBulkMarkReady}
          disabled={!!bulkLoading}
        >
          {bulkLoading === "marking" ? "Marking…" : "Mark complete as Ready"}
        </button>
        <button
          style={{
            padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: bulkLoading === "publishing" ? "#dcfce7" : "#16a34a",
            color: "#fff", border: "none", cursor: bulkLoading ? "not-allowed" : "pointer",
            opacity: bulkLoading ? 0.7 : 1,
          }}
          onClick={handleBulkPublish}
          disabled={!!bulkLoading}
        >
          {bulkLoading === "publishing" ? "Publishing…" : "Publish all Ready"}
        </button>
        {bulkResult && (
          <span style={{ fontSize: 12, color: bulkResult.startsWith("Error") ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
            {bulkResult}
          </span>
        )}
      </div>

      <div style={s.filters}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", alignSelf: "center" }}>
          Review status:
        </span>
        {(["all", "needs_review", "in_progress", "ready"] as const).map((v) => (
          <button
            key={v}
            style={chipStyle((reviewFilter ?? "all") === v)}
            onClick={() => setReviewFilter(v === "all" ? undefined : v)}
          >
            {v === "all" ? "All" : v.replace("_", " ")}
          </button>
        ))}
        <span style={{ width: 12 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", alignSelf: "center" }}>
          Missing:
        </span>
        {(["openingHours", "menuText", "address", "coordinates", "phone"] as const).map((v) => (
          <button
            key={v}
            style={chipStyle(missingFilter === v)}
            onClick={() => setMissingFilter(missingFilter === v ? undefined : v)}
          >
            {v === "openingHours" ? "Hours" : v === "menuText" ? "Menu" : v === "coordinates" ? "Coords" : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {!orgs ? (
        <div style={{ padding: 24, textAlign: "center", color: "#888" }}>Loading…</div>
      ) : orgs.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
          No venues match the current filters.
        </div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Location</th>
              <th style={s.th}>Data completeness</th>
              <th style={s.th}>Review</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org: OrgRow) => (
              <tr
                key={org._id}
                style={rowStyle(org._id === selected)}
                onClick={() => setSelected(org._id === selected ? null : org._id)}
              >
                <td style={s.td}>
                  <div style={{ fontWeight: 600 }}>{org.name}</div>
                  {org.listingStatus === "published" && (
                    <span style={s.publishedTag}>Published</span>
                  )}
                </td>
                <td style={s.td} onClick={(e) => e.stopPropagation()}>
                  <span style={{ color: "#6b7280" }}>{org.venueType ?? "—"}</span>
                </td>
                <td style={s.td}>
                  <div>{org.city ?? "—"}</div>
                  {org.neighborhood && (
                    <div style={{ fontSize: 11, color: "#888" }}>{org.neighborhood}</div>
                  )}
                </td>
                <td style={{ ...s.td }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <CompletenessBadge
                      label="Hours"
                      present={!!(org.openingHours && org.openingHours.length > 0)}
                    />
                    <CompletenessBadge
                      label="Menu"
                      present={!!org.menuText}
                    />
                    <CompletenessBadge
                      label="Coords"
                      present={!!org.coordinates}
                    />
                    <CompletenessBadge
                      label="Phone"
                      present={!!org.phone}
                    />
                    <CompletenessBadge
                      label={`${org.photoCount} photo${org.photoCount !== 1 ? "s" : ""}`}
                      present={org.photoCount > 0}
                      partial={org.photoCount > 0 && org.photoCount < 3}
                    />
                  </div>
                </td>
                <td style={s.td}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        org.reviewStatus === "ready"
                          ? "#dcfce7"
                          : org.reviewStatus === "in_progress"
                          ? "#fef3c7"
                          : "#fee2e2",
                      color:
                        org.reviewStatus === "ready"
                          ? "#15803d"
                          : org.reviewStatus === "in_progress"
                          ? "#92400e"
                          : "#991b1b",
                    }}
                  >
                    {org.reviewStatus ?? "needs_review"}
                  </span>
                </td>
                <td style={{ ...s.td, width: 60 }} onClick={(e) => e.stopPropagation()}>
                  <button style={s.editBtn} onClick={() => setSelected(org._id)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedOrg && (
        <PlaceDetailDrawer
          org={selectedOrg}
          onClose={() => setSelected(null)}
          onSaved={() => setSelected(null)}
        />
      )}
    </div>
  );
}
