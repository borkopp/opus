import Foundation

enum PriceFormatting {
    static func format(minorUnits: Int, currency: String = "MKD") -> String {
        let major = Double(minorUnits) / 100
        if currency == "MKD" {
            return "\(Int(major.rounded()).formatted()) ден."
        }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 0
        return formatter.string(from: NSNumber(value: major)) ?? "\(major)"
    }

    static func priceRangeLabel(_ priceRange: String?) -> String? {
        switch priceRange {
        case "budget": return "€ Budget"
        case "mid": return "€€ Mid-range"
        case "premium": return "€€€ Premium"
        default: return nil
        }
    }
}
