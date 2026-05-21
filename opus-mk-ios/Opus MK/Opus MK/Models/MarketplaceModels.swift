import Foundation

struct Coordinates: Decodable, Hashable {
    let lat: Double
    let lng: Double
}

struct OpeningHoursEntry: Decodable, Hashable {
    let dayOfWeek: Int
    let open: String
    let close: String
    let isClosed: Bool
}

/// Row returned by `public:listPublished` / `public:searchPublished`.
struct PublishedListing: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let slug: String
    let industry: String?
    let logoUrl: String?
    let coverImageUrl: String?
    let tagline: String?
    let city: String?
    let neighborhood: String?
    let tags: [String]?
    let priceRange: String?
    let averageRating: Double?
    let reviewCount: Int?
    let isFeatured: Bool?
    let beautyCategory: String?
    let cuisine: [String]?
    let venueType: String?
    let coordinates: Coordinates?
    let openingHours: [OpeningHoursEntry]?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, slug, industry, logoUrl, coverImageUrl, tagline
        case city, neighborhood, tags, priceRange, averageRating, reviewCount
        case isFeatured, beautyCategory, cuisine, venueType, coordinates, openingHours
    }

    var thumbnailPath: String? {
        logoUrl ?? coverImageUrl
    }

    var venueLabel: String {
        VenueLabel.text(for: self)
    }

    var priceRangeSymbol: String? {
        switch priceRange {
        case "budget": return "€"
        case "mid": return "€€"
        case "premium": return "€€€"
        default: return nil
        }
    }
}

struct ListPublishedResponse: Decodable {
    let items: [PublishedListing]
    let nextCursor: String?
    let totalCount: Int?
}
