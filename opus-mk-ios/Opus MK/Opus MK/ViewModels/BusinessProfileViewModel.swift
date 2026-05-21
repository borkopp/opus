import Foundation

@MainActor
@Observable
final class BusinessProfileViewModel {
    let slug: String

    var profile: PublicProfile?
    var reviews: [OrgReview] = []
    var isLoadingProfile = true
    var isLoadingReviews = false
    var errorMessage: String?

    /// Shown on the loading screen in DEBUG so you can read logs without Xcode.
    var debugLines: [String] = []

    // Tracks the current load so stale responses from a previous slug are ignored.
    private var loadGeneration = 0
    // Holds the in-flight retry task so we can cancel it before starting a new one.
    private var retryTask: Task<Void, Never>?

    init(slug: String) {
        self.slug = slug
    }

    /// Called from `.task(id: slug)`.
    func load() async {
        loadGeneration += 1
        let generation = loadGeneration

        ProfileDebugLog.clear()
        // Batch all state mutations into a single synchronous block so SwiftUI
        // only needs to diff and re-render once instead of once per assignment.
        profile = nil
        reviews = []
        errorMessage = nil
        isLoadingProfile = true
        isLoadingReviews = false
        debugLines = []

        ProfileDebugLog.log("load() gen=\(generation) slug=\(slug)")
        ProfileDebugLog.log("using HTTP /api/query (WS often stuck on connecting in local dev)")

        do {
            let value = try await ConvexHTTPQuery.getPublicProfile(slug: slug)

            guard generation == loadGeneration, !Task.isCancelled else {
                ProfileDebugLog.log("stale generation after fetch")
                syncDebugLines()
                return
            }

            profile = value
            isLoadingProfile = false

            if let value {
                ProfileDebugLog.log("profile OK: \(value.name)")
                syncDebugLines()
                await loadReviews(orgId: value.id, generation: generation)
            } else {
                errorMessage = "Business not found for slug: \(slug)"
                ProfileDebugLog.log("profile null")
                syncDebugLines()
            }
        } catch is CancellationError {
            guard generation == loadGeneration else { return }
            isLoadingProfile = false
            ProfileDebugLog.log("cancelled")
            syncDebugLines()
        } catch {
            guard generation == loadGeneration else { return }
            isLoadingProfile = false
            errorMessage = userFacingMessage(for: error)
            ProfileDebugLog.logError("load failed", error)
            syncDebugLines()
        }
    }

    func cancel() {
        retryTask?.cancel()
        retryTask = nil
    }

    func retry() {
        // Cancel any previously running retry before starting a new one.
        retryTask?.cancel()
        retryTask = Task { await load() }
    }

    // MARK: - Reviews (HTTP)

    private func loadReviews(orgId: String, generation: Int) async {
        guard generation == loadGeneration else { return }
        isLoadingReviews = true
        ProfileDebugLog.log("reviews HTTP orgId=\(orgId)")

        do {
            let items = try await ConvexHTTPQuery.listReviews(orgId: orgId)
            guard generation == loadGeneration else { return }
            reviews = items
            ProfileDebugLog.log("reviews OK count=\(items.count)")
        } catch {
            guard generation == loadGeneration else { return }
            reviews = []
            ProfileDebugLog.logError("reviews failed", error)
        }
        isLoadingReviews = false
        syncDebugLines()
    }

    // MARK: - Diagnostics

    /// Flush the debug log into the observable property exactly once per logical
    /// operation rather than after every individual `log()` call.
    private func syncDebugLines() {
        debugLines = ProfileDebugLog.snapshot()
    }

    private func userFacingMessage(for error: Error) -> String {
        let detail = ProfileDebugLog.describe(error)
        if detail.localizedCaseInsensitiveContains("connect")
            || detail.localizedCaseInsensitiveContains("network")
            || detail.localizedCaseInsensitiveContains("refused")
        {
            return "Cannot reach Convex. On a physical device, use your Mac's LAN IP in Secrets.plist (not 127.0.0.1)."
        }
        return "Could not load this business."
    }
}
