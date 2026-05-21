import SwiftUI

private let weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

enum HospitalityTab: String, CaseIterable, Identifiable {
    case general = "General"
    case menu = "Menu"
    case hours = "Hours"

    var id: String { rawValue }
}

struct HospitalityProfileSection: View {
    let profile: PublicProfile
    @State private var selectedTab: HospitalityTab = .general

    private var visibleTabs: [HospitalityTab] {
        var tabs: [HospitalityTab] = [.general]
        if let menu = profile.menuText, !menu.isEmpty { tabs.append(.menu) }
        if let hours = profile.openingHours, !hours.isEmpty { tabs.append(.hours) }
        return tabs
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if visibleTabs.count > 1 {
                Picker("Section", selection: $selectedTab) {
                    ForEach(visibleTabs) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
            }

            Group {
                switch selectedTab {
                case .general:
                    generalContent
                case .menu:
                    menuContent
                case .hours:
                    hoursContent
                }
            }
        }
        .onAppear {
            if !visibleTabs.contains(selectedTab) {
                selectedTab = visibleTabs.first ?? .general
            }
        }
    }

    @ViewBuilder
    private var generalContent: some View {
        let hasTags = profile.venueType != nil
            || !(profile.cuisine?.isEmpty ?? true)
            || !(profile.tags?.isEmpty ?? true)
            || profile.priceRange != nil
        if hasTags {
        FlowLayout(spacing: 8) {
            if let venueType = profile.venueType {
                tag(venueType.capitalized)
            }
            if let cuisine = profile.cuisine {
                ForEach(cuisine, id: \.self) { tag($0.capitalized) }
            }
            if let tags = profile.tags {
                ForEach(tags, id: \.self) { tag($0.capitalized) }
            }
            if let label = PriceFormatting.priceRangeLabel(profile.priceRange) {
                tag(label)
            }
        }
        } else {
            Text("No details available yet.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private var menuContent: some View {
        if let menuText = profile.menuText, !menuText.isEmpty {
            Text(menuText)
                .font(.subheadline)
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private var hoursContent: some View {
        if let hours = profile.openingHours {
            let today = todayIndex()
            let sorted = hours.sorted { $0.dayOfWeek < $1.dayOfWeek }
            VStack(spacing: 4) {
                ForEach(sorted, id: \.dayOfWeek) { entry in
                    hoursRow(entry, isToday: entry.dayOfWeek == today)
                }
            }
        }
    }

    private func hoursRow(_ entry: OpeningHoursEntry, isToday: Bool) -> some View {
        HStack {
            HStack(spacing: 6) {
                Text(weekdays[safe: entry.dayOfWeek] ?? "—")
                if isToday {
                    Text("TODAY")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.green)
                }
            }
            .font(isToday ? .subheadline.weight(.semibold) : .subheadline)
            Spacer()
            if entry.isClosed {
                Text("Closed")
                    .font(.subheadline)
                    .foregroundStyle(.red.opacity(0.8))
            } else {
                Text("\(entry.open) – \(entry.close)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(isToday ? Color.primary.opacity(0.06) : Color.clear, in: RoundedRectangle(cornerRadius: 12))
    }

    private func tag(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(.quaternary, in: Capsule())
    }

    private func todayIndex() -> Int {
        let jsDay = Calendar.current.component(.weekday, from: Date())
        return jsDay == 1 ? 6 : jsDay - 2
    }
}

/// Simple wrapping layout for tags.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
