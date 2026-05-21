import SwiftUI

struct BusinessRowView: View {
    let listing: PublishedListing
    var showsAiPick: Bool = false

    private var isOpen: Bool {
        OpeningHoursHelper.isOpenNow(listing.openingHours)
    }

    var body: some View {
        HStack(alignment: .center, spacing: 16) {
            if listing.thumbnailPath != nil {
                thumbnail
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(listing.name)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(OpusTheme.fg1)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                    if showsAiPick {
                        aiPickBadge
                    }
                }

                Text(listing.venueLabel)
                    .font(.subheadline)
                    .foregroundStyle(OpusTheme.mutedFg)
                    .lineLimit(1)

                HStack(spacing: 12) {
                    if let rating = listing.averageRating, rating > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(OpusTheme.rating)
                            Text(String(format: "%.1f", rating))
                                .font(.caption.weight(.medium))
                                .foregroundStyle(OpusTheme.fg1)
                            if let count = listing.reviewCount, count > 0 {
                                Text("(\(count))")
                                    .font(.caption)
                                    .foregroundStyle(OpusTheme.mutedFg)
                            }
                        }
                    }

                    HStack(spacing: 4) {
                        Circle()
                            .fill(isOpen ? Color(red: 0.3, green: 0.85, blue: 0.5) : Color.red.opacity(0.6))
                            .frame(width: 6, height: 6)
                        Text(isOpen ? "Open" : "Closed")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(isOpen ? Color(red: 0.3, green: 0.85, blue: 0.5) : Color.red.opacity(0.7))
                    }
                }
                .padding(.top, 2)
            }
        }
        .padding(.vertical, 16)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(OpusTheme.borderSubtle)
                .frame(height: 1)
        }
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let url = AppConfig.mediaURL(for: listing.thumbnailPath) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    thumbnailPlaceholder
                }
            }
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(OpusTheme.border, lineWidth: 1)
            )
        }
    }

    private var thumbnailPlaceholder: some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(OpusTheme.secondary)
            .frame(width: 64, height: 64)
    }

    private var aiPickBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: "sparkle")
                .font(.system(size: 10))
            Text("AI PICK")
                .font(.system(size: 10, weight: .medium))
                .tracking(0.8)
        }
        .foregroundStyle(OpusTheme.accentSoft)
        .padding(.horizontal, 6)
        .padding(.vertical, 4)
        .background(OpusTheme.accentSoft.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .stroke(OpusTheme.accentSoft.opacity(0.2), lineWidth: 1)
        )
    }
}
