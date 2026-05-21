import ClerkKit
import ClerkKitUI
import SwiftUI

struct DiscoverView: View {
    @State private var viewModel = DiscoverViewModel()
    @State private var authIsPresented = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if !viewModel.isSearchActive {
                        CategoryRailView(
                            availableIds: viewModel.availableCategoryIds,
                            selectedCategory: $viewModel.selectedCategory
                        )
                    }

                    contentSection
                }
                .padding(.vertical)
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.large)
            .searchable(
                text: $viewModel.searchQuery,
                placement: .navigationBarDrawer(displayMode: .always),
                prompt: "Search salons, restaurants…"
            )
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    UserButton(signedOutContent: {
                        Button("Sign In", action: { authIsPresented = true })
                    })
                    .prefetchClerkImages()
                }
            }
            .navigationDestination(for: BusinessProfileRoute.self) { route in
                BusinessProfileView(slug: route.slug)
            }
        }
        .sheet(isPresented: $authIsPresented) {
            AuthView()
        }
        .task { viewModel.start() }
        .onDisappear { viewModel.stop() }
        .overlay(alignment: .bottom) {
            #if DEBUG
            VStack(alignment: .leading, spacing: 2) {
                Text("loading: \(viewModel.isLoading ? "YES" : "no")")
                Text("listings: \(viewModel.rawListings.count)")
                Text("task: \(viewModel.subscriptionTask != nil ? "alive" : "nil")")
                Text("error: \(viewModel.errorMessage ?? "—")")
            }
            .font(.system(size: 11, design: .monospaced))
            .foregroundStyle(.white)
            .padding(8)
            .background(.black.opacity(0.75), in: RoundedRectangle(cornerRadius: 8))
            .padding()
            #endif
        }
        .onChange(of: viewModel.searchQuery) { _, _ in
            viewModel.restartSubscription()
        }
    }

    @ViewBuilder
    private var contentSection: some View {
        let feed = viewModel.feed

        if viewModel.isLoading && viewModel.rawListings.isEmpty {
            DiscoverSkeletonView()
        } else if let error = viewModel.errorMessage, viewModel.rawListings.isEmpty {
            ContentUnavailableView {
                Label("Could Not Load", systemImage: "wifi.exclamationmark")
            } description: {
                Text(error)
            } actions: {
                Button("Retry") { viewModel.restartSubscription() }
            }
            .padding()
        } else if feed.featured.isEmpty && feed.nearYou.isEmpty {
            ContentUnavailableView(
                "No Results",
                systemImage: "building.2",
                description: Text(
                    viewModel.isSearchActive
                        ? "Try a different search."
                        : "No published businesses in this area yet."
                )
            )
            .padding()
        } else {
            VStack(alignment: .leading, spacing: 28) {
                if !viewModel.isSearchActive {
                    HorizontalListingSection(title: "Featured", listings: feed.featured)
                }

                HorizontalListingSection(
                    title: viewModel.isSearchActive
                        ? "Results for \"\(viewModel.searchQuery)\""
                        : "Near You",
                    listings: feed.nearYou
                )
            }
        }
    }
}

#Preview {
    DiscoverView()
        .environment(Clerk.shared)
}
