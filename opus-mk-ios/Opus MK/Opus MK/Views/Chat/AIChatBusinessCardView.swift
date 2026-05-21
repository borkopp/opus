import SwiftUI

struct AIChatBusinessCardView: View {
    let rec: AIChatRecommendation

    private var minsUntilClose: Int? {
        guard let closesAt = rec.closesAt, rec.isOpenNow == true else { return nil }
        let parts = closesAt.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2 else { return nil }
        let closeMins = parts[0] * 60 + parts[1]
        let cal = Calendar.current
        let now = Date()
        let nowMins = cal.component(.hour, from: now) * 60 + cal.component(.minute, from: now)
        return closeMins > nowMins ? closeMins - nowMins : closeMins + 1440 - nowMins
    }

    private var closingSoon: Bool { (minsUntilClose ?? Int.max) <= 60 }

    private func fmtClose(_ hhmm: String) -> String {
        let parts = hhmm.split(separator: ":").compactMap { Int($0) }
        guard parts.count == 2 else { return hhmm }
        let h = parts[0], m = parts[1]
        let suffix = h >= 12 ? "pm" : "am"
        let h12 = h == 0 ? 12 : h > 12 ? h - 12 : h
        return m == 0 ? "\(h12)\(suffix)" : "\(h12):\(String(format: "%02d", m))\(suffix)"
    }

    private func fmtDist(_ m: Double) -> String {
        m < 1000 ? "\(Int(m.rounded()))m" : String(format: "%.1fkm", m / 1000)
    }

    var body: some View {
        NavigationLink(value: BusinessProfileRoute(slug: rec.slug)) {
            HStack(spacing: 0) {
                statusBar
                cardBody
            }
            .background(OpusTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(OpusTheme.border)
            )
        }
        .buttonStyle(.plain)
    }

    private var statusBar: some View {
        Rectangle()
            .fill(
                closingSoon
                    ? Color.orange.opacity(0.7)
                    : (rec.isOpenNow == true ? Color.green.opacity(0.6) : Color.red.opacity(0.3))
            )
            .frame(width: 3)
    }

    private var cardBody: some View {
        VStack(alignment: .leading, spacing: 6) {
            nameRow
            if rec.venueType != nil || !(rec.cuisine ?? []).isEmpty { tagChips }
            if let reason = rec.reason, !reason.isEmpty { reasonText(reason) }
            metaRow
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var nameRow: some View {
        HStack(alignment: .center) {
            Text(rec.name ?? rec.slug)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(OpusTheme.fg1)
                .lineLimit(1)

            Spacer(minLength: 8)

            if let isOpen = rec.isOpenNow {
                Text(isOpen ? "Open" : "Closed")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(closingSoon ? .orange : (isOpen ? .green : Color.red.opacity(0.8)))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(
                        (closingSoon ? Color.orange : (isOpen ? Color.green : Color.red)).opacity(0.15),
                        in: Capsule()
                    )
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 11))
                .foregroundStyle(OpusTheme.fg3.opacity(0.4))
        }
    }

    private var tagChips: some View {
        HStack(spacing: 6) {
            if let v = rec.venueType { chip(v.capitalized) }
            ForEach((rec.cuisine ?? []).prefix(3), id: \.self) { chip($0.capitalized) }
        }
    }

    private func reasonText(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12))
            .foregroundStyle(OpusTheme.mutedFg)
            .lineLimit(2)
    }

    private var metaRow: some View {
        HStack(spacing: 12) {
            if let rating = rec.averageRating, rating > 0 {
                HStack(spacing: 3) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(OpusTheme.rating)
                    Text(String(format: "%.1f", rating))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(OpusTheme.fg1)
                    if let count = rec.reviewCount {
                        Text("(\(count))")
                            .font(.system(size: 11))
                            .foregroundStyle(OpusTheme.mutedFg)
                    }
                }
            }

            if let dist = rec.distanceM {
                Text("\(fmtDist(dist)) away")
                    .font(.system(size: 11))
                    .foregroundStyle(OpusTheme.mutedFg)
            }

            if let closesAt = rec.closesAt, rec.isOpenNow == true {
                let suffix = closingSoon ? " · \(minsUntilClose ?? 0)m" : ""
                Text("Closes \(fmtClose(closesAt))\(suffix)")
                    .font(.system(size: 11, weight: closingSoon ? .medium : .regular))
                    .foregroundStyle(closingSoon ? .orange : OpusTheme.mutedFg)
            }

            if let opensAt = rec.opensAt, rec.isOpenNow != true {
                Text("Opens \(opensAt)")
                    .font(.system(size: 11))
                    .foregroundStyle(OpusTheme.mutedFg)
            }
        }
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .medium))
            .foregroundStyle(OpusTheme.mutedFg)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(OpusTheme.secondary, in: Capsule())
    }
}
