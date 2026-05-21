import SwiftUI

struct DiscoverSkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            skeletonSection
            skeletonSection
        }
        .padding(.horizontal)
        .redacted(reason: .placeholder)
    }

    private var skeletonSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            RoundedRectangle(cornerRadius: 6)
                .fill(.quaternary)
                .frame(width: 120, height: 24)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(0..<3, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(.quaternary)
                            .frame(width: OpusTheme.coverCardWidth, height: OpusTheme.coverCardHeight)
                    }
                }
            }
        }
    }
}
