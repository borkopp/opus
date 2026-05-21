import Foundation

enum VenueLabel {
    static func text(for listing: PublishedListing) -> String {
        if listing.industry == "hospitality" {
            let type = listing.venueType?
                .replacingOccurrences(of: "_", with: " ")
                .capitalized ?? "Restaurant"
            if let cuisine = listing.cuisine?.first, !cuisine.isEmpty {
                return "\(type) · \(cuisine)"
            }
            return type
        }
        return BeautyCategories.label(for: listing.beautyCategory)
            ?? listing.beautyCategory?
                .replacingOccurrences(of: "_", with: " ")
                .capitalized
            ?? "Beauty"
    }
}
