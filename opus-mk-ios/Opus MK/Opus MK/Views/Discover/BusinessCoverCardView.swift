import SwiftUI

struct BusinessCoverCardView: View {
    let listing: PublishedListing

    private let cardWidth = OpusTheme.coverCardWidth
    private let cardHeight = OpusTheme.coverCardHeight

    private var isOpen: Bool {
        OpeningHoursHelper.isOpenNow(listing.openingHours)
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            coverBackground
            LinearGradient(
                colors: [.black.opacity(0.85), .black.opacity(0.35), .clear],
                startPoint: .bottom,
                endPoint: .center
            )

            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top) {
                    if isOpen { openBadge }
                    Spacer(minLength: 0)
                    if let rating = listing.averageRating, rating > 0 {
                        ratingBadge(rating)
                    }
                }

                Spacer(minLength: 0)

                VStack(alignment: .leading, spacing: 4) {
                    Text(listing.name)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text(listing.venueLabel)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    HStack(alignment: .center) {
                        if let city = listing.city {
                            Label {
                                Text(city)
                                    .lineLimit(1)
                            } icon: {
                                Image(systemName: "mappin.and.ellipse")
                            }
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.75))
                            .labelStyle(.titleAndIcon)
                        }
                        Spacer(minLength: 0)
                        if let price = listing.priceRangeSymbol {
                            Text(price)
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.white.opacity(0.75))
                        }
                    }
                }
                .frame(width: cardWidth - 24, alignment: .leading)
            }
            .padding(12)
            .frame(width: cardWidth, height: cardHeight, alignment: .leading)
        }
        .frame(width: cardWidth, height: cardHeight)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    @ViewBuilder
    private var coverBackground: some View {
        Group {
            if let url = AppConfig.mediaURL(for: listing.coverImageUrl ?? listing.logoUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        fallbackCover
                    }
                }
            } else {
                fallbackCover
            }
        }
        .frame(width: cardWidth, height: cardHeight)
        .clipped()
    }

    private var fallbackCover: some View {
        ZStack {
            Rectangle().fill(.quaternary)
            if let url = AppConfig.mediaURL(for: listing.logoUrl) {
                AsyncImage(url: url) { phase in
                    if case .success(let image) = phase {
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: 56, height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    } else {
                        initialBadge
                    }
                }
            } else {
                initialBadge
            }
        }
    }

    private var initialBadge: some View {
        Text(String(listing.name.prefix(1)).uppercased())
            .font(.title2.bold())
            .foregroundStyle(.secondary)
            .frame(width: 56, height: 56)
            .background(.background)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var openBadge: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(.green)
                .frame(width: 6, height: 6)
            Text("Open")
                .font(.caption2.weight(.medium))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.black.opacity(0.45), in: Capsule())
    }

    private func ratingBadge(_ rating: Double) -> some View {
        HStack(spacing: 3) {
            Image(systemName: "star.fill")
                .font(.caption2)
                .foregroundStyle(.yellow)
            Text(String(format: "%.1f", rating))
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.black.opacity(0.45), in: Capsule())
    }
}
