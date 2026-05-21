import Combine
import ConvexMobile
import Foundation

struct DiscoverFeed {
    let featured: [PublishedListing]
    let nearYou: [PublishedListing]
}

@MainActor
@Observable
final class DiscoverViewModel {
    var rawListings: [PublishedListing] = []
    var isLoading = true
    var errorMessage: String?
    var searchQuery = ""
    var selectedCategory: String?

    var city: String? = "Skopje"

    private let client: ConvexClientWithAuth<String>
    #if DEBUG
    private(set) var subscriptionTask: Task<Void, Never>?
    #else
    private var subscriptionTask: Task<Void, Never>?
    #endif

    init(client: ConvexClientWithAuth<String> = ConvexEnvironment.shared.client) {
        self.client = client
    }

    var isSearchActive: Bool { searchQuery.count >= 2 }

    var availableCategoryIds: Set<String> {
        Set(rawListings.compactMap(\.beautyCategory))
    }

    var feed: DiscoverFeed {
        DiscoverFeedBuilder.build(
            from: filteredListings,
            isSearchActive: isSearchActive
        )
    }

    private var filteredListings: [PublishedListing] {
        rawListings.filter { listing in
            if let selectedCategory, listing.beautyCategory != selectedCategory {
                return false
            }
            return true
        }
    }

    func start() {
        // Only start a fresh subscription if one isn't already running.
        guard subscriptionTask == nil || subscriptionTask?.isCancelled == true else {
            print("[Discover] start() — task already running, skipping")
            return
        }
        print("[Discover] start() — launching subscription")
        restartSubscription()
    }

    func stop() {
        print("[Discover] stop() — cancelling task, listings=\(rawListings.count)")
        subscriptionTask?.cancel()
        subscriptionTask = nil
    }

    func restartSubscription() {
        print("[Discover] restartSubscription()")
        subscriptionTask?.cancel()
        subscriptionTask = nil
        isLoading = true
        errorMessage = nil
        subscriptionTask = Task {
            await subscribe()
        }
    }

    private func subscribe() async {
        isLoading = true
        errorMessage = nil

        var baseArgs: [String: ConvexEncodable?] = [:]
        if let city, !city.isEmpty {
            baseArgs["city"] = city
        }

        do {
            if isSearchActive {
                var args = baseArgs
                args["query"] = searchQuery
                let publisher = client.subscribe(
                    to: "public:searchPublished",
                    with: args,
                    yielding: [PublishedListing].self
                )
                for try await items in publisher.values {
                    guard !Task.isCancelled else { break }
                    rawListings = items
                    isLoading = false
                    errorMessage = nil
                }
            } else {
                let publisher = client.subscribe(
                    to: "public:listPublished",
                    with: baseArgs.isEmpty ? nil : baseArgs,
                    yielding: ListPublishedResponse.self
                )
                for try await response in publisher.values {
                    guard !Task.isCancelled else { break }
                    rawListings = response.items
                    isLoading = false
                    errorMessage = nil
                }
            }
        } catch {
            if error is CancellationError { return }
            rawListings = []
            isLoading = false
            errorMessage = convexErrorMessage(error)
            #if DEBUG
            print("[Discover] subscription failed:", error)
            #endif
        }
    }

    private func convexErrorMessage(_ error: Error) -> String {
        let detail = String(describing: error)
        if detail.localizedCaseInsensitiveContains("connect")
            || detail.localizedCaseInsensitiveContains("network")
            || detail.localizedCaseInsensitiveContains("refused")
        {
            return "Cannot reach Convex. On a physical device, use your Mac's IP in Secrets.plist instead of 127.0.0.1."
        }
        return "Could not load listings. Check Convex is running and the deployment URL in Secrets.plist."
    }
}

// MARK: - Featured / feed split (mirrors DiscoverClient.tsx)

enum DiscoverFeedBuilder {
    static func build(
        from items: [PublishedListing],
        isSearchActive: Bool
    ) -> DiscoverFeed {
        if isSearchActive {
            return DiscoverFeed(featured: [], nearYou: items)
        }

        let featuredCandidates = items.filter { $0.isFeatured == true }
        let openCandidates = items.filter {
            $0.isFeatured != true && OpeningHoursHelper.isOpenNow($0.openingHours)
        }

        var featured = featuredCandidates
        if featured.count < 3 {
            let topUp = openCandidates.filter { o in !featured.contains(where: { $0.id == o.id }) }
            featured.append(contentsOf: topUp.prefix(5 - featured.count))
        } else {
            featured = Array(featured.prefix(5))
        }

        let featuredIds = Set(featured.map(\.id))
        let nearYou = items.filter { !featuredIds.contains($0.id) }
        return DiscoverFeed(featured: featured, nearYou: nearYou)
    }
}
