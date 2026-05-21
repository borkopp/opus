import Foundation

struct BeautyCategoryItem: Identifiable, Hashable {
    let id: String
    let label: String
    let symbol: String
}

enum BeautyCategories {
    static let all: [BeautyCategoryItem] = [
        .init(id: "barbershop", label: "Barbershop", symbol: "scissors"),
        .init(id: "hair_salon", label: "Hair Salon", symbol: "paintbrush"),
        .init(id: "nail_salon", label: "Nail Salon", symbol: "hand.raised"),
        .init(id: "spa", label: "Spa", symbol: "leaf"),
        .init(id: "beauty_salon", label: "Beauty Salon", symbol: "heart"),
        .init(id: "lash_studio", label: "Lash Studio", symbol: "eye"),
        .init(id: "brow_bar", label: "Brow Bar", symbol: "face.smiling"),
        .init(id: "tattoo_studio", label: "Tattoo Studio", symbol: "flame"),
        .init(id: "massage_therapy", label: "Massage Therapy", symbol: "figure.mind.and.body"),
        .init(id: "wellness_center", label: "Wellness Center", symbol: "figure.yoga"),
        .init(id: "personal_trainer", label: "Personal Trainer", symbol: "figure.run"),
    ]

    static func label(for id: String?) -> String? {
        guard let id else { return nil }
        return all.first { $0.id == id }?.label
    }
}
