import ClerkConvex
import ClerkKit
import ConvexMobile

/// Shared Convex + Clerk client for the app lifetime.
@MainActor
final class ConvexEnvironment {
    static let shared = ConvexEnvironment()

    let client: ConvexClientWithAuth<String>

    private init() {
        Clerk.configure(publishableKey: AppConfig.clerkPublishableKey)
        client = ConvexClientWithAuth(
            deploymentUrl: AppConfig.convexDeploymentURL,
            authProvider: ClerkConvexAuthProvider()
        )
    }
}
