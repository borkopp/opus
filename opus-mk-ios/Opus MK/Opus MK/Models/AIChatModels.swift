import Foundation

struct AIChatMessage: Identifiable {
    let id: String
    let role: AIChatRole
    var content: String
    var recommendations: [AIChatRecommendation]?
    var isStreaming: Bool

    static func user(content: String) -> AIChatMessage {
        AIChatMessage(id: UUID().uuidString, role: .user, content: content, isStreaming: false)
    }

    static func assistant(id: String) -> AIChatMessage {
        AIChatMessage(id: id, role: .assistant, content: "", isStreaming: true)
    }
}

enum AIChatRole {
    case user, assistant
}

struct AIChatRecommendation: Identifiable, Decodable {
    let orgId: String
    let slug: String
    let name: String?
    let reason: String?
    let venueType: String?
    let cuisine: [String]?
    let availabilityHint: String?
    let averageRating: Double?
    let reviewCount: Int?
    let city: String?
    let distanceM: Double?
    let isOpenNow: Bool?
    let closesAt: String?
    let opensAt: String?
    let bookingUrl: String?

    var id: String { orgId }
}
