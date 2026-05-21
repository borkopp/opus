import SwiftUI

struct HorizontalListingSection: View {
    let title: String
    let listings: [PublishedListing]

    var body: some View {
        if listings.isEmpty { EmptyView() }
        else {
            VStack(alignment: .leading, spacing: 12) {
                Text(title)
                    .font(.title2.bold())
                    .padding(.horizontal)

                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 16) {
                        ForEach(listings) { listing in
                            NavigationLink(value: BusinessProfileRoute(slug: listing.slug)) {
                                BusinessCoverCardView(listing: listing)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .scrollTargetLayout()
                    .padding(.horizontal)
                }
                .scrollTargetBehavior(.viewAligned)
            }
        }
    }
}
