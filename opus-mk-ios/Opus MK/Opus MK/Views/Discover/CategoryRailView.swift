import SwiftUI

struct CategoryRailView: View {
    let availableIds: Set<String>
    @Binding var selectedCategory: String?

    private var categories: [BeautyCategoryItem] {
        BeautyCategories.all.filter { availableIds.contains($0.id) }
    }

    var body: some View {
        if categories.isEmpty { EmptyView() }
        else {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    categoryButton(label: "All", isSelected: selectedCategory == nil) {
                        selectedCategory = nil
                    }
                    ForEach(categories) { cat in
                        categoryButton(label: cat.label, isSelected: selectedCategory == cat.id) {
                            selectedCategory = selectedCategory == cat.id ? nil : cat.id
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    @ViewBuilder
    private func categoryButton(
        label: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        if isSelected {
            Button(label, action: action)
                .buttonStyle(.borderedProminent)
                .controlSize(.regular)
        } else {
            Button(label, action: action)
                .buttonStyle(.bordered)
                .controlSize(.regular)
        }
    }
}
