import Foundation

/// Loads deployment secrets from `Secrets.plist` in the app bundle.
/// Copy `Secrets.example.plist` → `Secrets.plist` before running (see opus-mk-ios/README.md).
enum AppConfig {
    static var convexDeploymentURL: String {
        requiredString(for: "CONVEX_DEPLOYMENT_URL")
    }

    static var clerkPublishableKey: String {
        requiredString(for: "CLERK_PUBLISHABLE_KEY")
    }

    /// Base URL of the opus-mk web app — used for the /api/chat SSE endpoint.
    static var opusMkBaseURL: String {
        requiredString(for: "OPUS_MK_BASE_URL")
    }

    /// Resolves Convex storage IDs to full URLs (matches opus-mk web helper).
    static func mediaURL(for pathOrId: String?) -> URL? {
        guard let pathOrId, !pathOrId.isEmpty else { return nil }
        if pathOrId.hasPrefix("http://") || pathOrId.hasPrefix("https://") {
            return URL(string: pathOrId)
        }
        guard var host = URL(string: convexDeploymentURL)?.host else { return nil }
        let port = URL(string: convexDeploymentURL)?.port
        if let port { host += ":\(port)" }
        let scheme = convexDeploymentURL.hasPrefix("https") ? "https" : "http"
        return URL(string: "\(scheme)://\(host)/api/storage/\(pathOrId)")
    }

    private static func requiredString(for key: String) -> String {
        guard
            let path = Bundle.main.path(forResource: "Secrets", ofType: "plist"),
            let dict = NSDictionary(contentsOfFile: path),
            let value = dict[key] as? String,
            !value.isEmpty,
            !value.contains("REPLACE_WITH")
        else {
            fatalError(
                "Missing \(key) in Secrets.plist. Copy Config/Secrets.example.plist → Config/Secrets.plist and fill values from opus-mk/.env.local."
            )
        }
        return value
    }
}
