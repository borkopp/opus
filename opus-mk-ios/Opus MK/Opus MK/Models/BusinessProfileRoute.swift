import Foundation

/// Typed navigation value for business profile pushes (must be registered on the same `NavigationStack`).
struct BusinessProfileRoute: Hashable {
    let slug: String
}
