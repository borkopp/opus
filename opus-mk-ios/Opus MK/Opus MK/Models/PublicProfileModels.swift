import Foundation

struct OrgMediaItem: Decodable, Identifiable, Hashable {
    let id: String
    let url: String
    let type: String
    let caption: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case url, type, caption
    }
}

struct PublicService: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let consumerDescription: String?
    let photoUrl: String?
    let durationMins: Int
    let priceMinorUnits: Int
    let currency: String
    let categoryName: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, consumerDescription, photoUrl, durationMins, priceMinorUnits, currency, categoryName
    }
}

struct PublicStaffMember: Decodable, Identifiable, Hashable {
    let id: String
    let displayName: String
    let bio: String?
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case displayName, bio, avatarUrl
    }
}

struct PublicProfile: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let slug: String
    let industry: String?
    let logoUrl: String?
    let tagline: String?
    let bio: String?
    let address: String?
    let city: String?
    let neighborhood: String?
    let coordinates: Coordinates?
    let phone: String?
    let instagramHandle: String?
    let websiteUrl: String?
    let openingHours: [OpeningHoursEntry]?
    let menuText: String?
    let tags: [String]?
    let priceRange: String?
    let beautyCategory: String?
    let cuisine: [String]?
    let venueType: String?
    let averageRating: Double?
    let reviewCount: Int?
    // These arrays may be absent from the Convex response rather than `[]`,
    // so we decode them with `decodeIfPresent` and default to empty.
    let media: [OrgMediaItem]
    let services: [PublicService]
    let aiWebchatEnabled: Bool?
    let aiPersonaName: String?
    let aiGreetingMessage: String?
    let staff: [PublicStaffMember]?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, slug, industry, logoUrl, tagline, bio, address, city, neighborhood
        case coordinates, phone, instagramHandle, websiteUrl, openingHours, menuText
        case tags, priceRange, beautyCategory, cuisine, venueType
        case averageRating, reviewCount, media, services
        case aiWebchatEnabled, aiPersonaName, aiGreetingMessage, staff
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id               = try c.decode(String.self, forKey: .id)
        name             = try c.decode(String.self, forKey: .name)
        slug             = try c.decode(String.self, forKey: .slug)
        industry         = try c.decodeIfPresent(String.self, forKey: .industry)
        logoUrl          = try c.decodeIfPresent(String.self, forKey: .logoUrl)
        tagline          = try c.decodeIfPresent(String.self, forKey: .tagline)
        bio              = try c.decodeIfPresent(String.self, forKey: .bio)
        address          = try c.decodeIfPresent(String.self, forKey: .address)
        city             = try c.decodeIfPresent(String.self, forKey: .city)
        neighborhood     = try c.decodeIfPresent(String.self, forKey: .neighborhood)
        coordinates      = try c.decodeIfPresent(Coordinates.self, forKey: .coordinates)
        phone            = try c.decodeIfPresent(String.self, forKey: .phone)
        instagramHandle  = try c.decodeIfPresent(String.self, forKey: .instagramHandle)
        websiteUrl       = try c.decodeIfPresent(String.self, forKey: .websiteUrl)
        openingHours     = try c.decodeIfPresent([OpeningHoursEntry].self, forKey: .openingHours)
        menuText         = try c.decodeIfPresent(String.self, forKey: .menuText)
        tags             = try c.decodeIfPresent([String].self, forKey: .tags)
        priceRange       = try c.decodeIfPresent(String.self, forKey: .priceRange)
        beautyCategory   = try c.decodeIfPresent(String.self, forKey: .beautyCategory)
        cuisine          = try c.decodeIfPresent([String].self, forKey: .cuisine)
        venueType        = try c.decodeIfPresent(String.self, forKey: .venueType)
        averageRating    = try c.decodeIfPresent(Double.self, forKey: .averageRating)
        reviewCount      = try c.decodeIfPresent(Int.self, forKey: .reviewCount)
        // Default to [] if the backend omits the key entirely
        media            = try c.decodeIfPresent([OrgMediaItem].self, forKey: .media) ?? []
        services         = try c.decodeIfPresent([PublicService].self, forKey: .services) ?? []
        aiWebchatEnabled = try c.decodeIfPresent(Bool.self, forKey: .aiWebchatEnabled)
        aiPersonaName    = try c.decodeIfPresent(String.self, forKey: .aiPersonaName)
        aiGreetingMessage = try c.decodeIfPresent(String.self, forKey: .aiGreetingMessage)
        staff            = try c.decodeIfPresent([PublicStaffMember].self, forKey: .staff)
    }

    var isHospitality: Bool { industry == "hospitality" }

    var coverMedia: OrgMediaItem? {
        media.first { $0.type == "cover" }
    }

    var galleryMedia: [OrgMediaItem] {
        media.filter { $0.type == "gallery" }
    }

    var locationLine: String? {
        let parts = [neighborhood, city].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    var servicesByCategory: [(name: String, services: [PublicService])] {
        let grouped = Dictionary(grouping: services) { $0.categoryName ?? "Services" }
        return grouped.keys.sorted().map { key in
            (name: key, services: grouped[key] ?? [])
        }
    }
}

struct OrgReview: Decodable, Identifiable, Hashable {
    let id: String
    let rating: Int
    let body: String?
    let createdAt: Double
    let reply: String?
    let repliedAt: Double?
    let reviewerName: String
    let reviewerAvatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case rating, body, createdAt, reply, repliedAt, reviewerName, reviewerAvatarUrl
    }
}
