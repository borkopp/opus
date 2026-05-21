import Foundation

/// One-shot Convex queries over HTTP (no WebSocket).
///
/// Local Convex dev (`http://host:3210`) often never reaches WebSocket `connected` on device,
/// while `/api/query` works — profile and reviews use this path.
enum ConvexHTTPQuery {
    struct Envelope<T: Decodable>: Decodable {
        let status: String
        let value: T?
        let errorMessage: String?
    }

    enum QueryError: LocalizedError {
        case badURL
        case httpStatus(Int)
        case apiError(String)
        case decodeFailed(String)

        var errorDescription: String? {
            switch self {
            case .badURL: "Invalid Convex deployment URL"
            case .httpStatus(let code): "HTTP \(code)"
            case .apiError(let msg): msg
            case .decodeFailed(let msg): msg
            }
        }
    }

    static func getPublicProfile(slug: String) async throws -> PublicProfile? {
        try await run(path: "public:getPublicProfile", args: ["slug": slug])
    }

    static func listReviews(orgId: String, limit: Int = 20) async throws -> [OrgReview] {
        try await run(path: "reviews:listByOrg", args: ["orgId": orgId, "limit": limit]) ?? []
    }

    // MARK: - Core

    /// Shared session with a tight connection timeout so bad network conditions
    /// surface quickly rather than hanging the UI for the system default 60 s.
    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        return URLSession(configuration: config)
    }()

    /// Reuse a single decoder — allocation is cheap but why pay it on every call.
    private static let decoder = JSONDecoder()

    private static func run<T: Decodable>(
        path: String,
        args: [String: Any]
    ) async throws -> T? {
        let base = AppConfig.convexDeploymentURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: "\(base)/api/query") else {
            throw QueryError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "path": path,
            "args": args,
            "format": "json",
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        ProfileDebugLog.log("HTTP \(path) → \(url.host ?? "?")")

        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? -1
        ProfileDebugLog.log("HTTP \(path) status=\(status) bytes=\(data.count)")

        guard (200 ... 299).contains(status) else {
            throw QueryError.httpStatus(status)
        }

        do {
            let envelope = try decoder.decode(Envelope<T>.self, from: data)
            if envelope.status == "success" {
                return envelope.value
            }
            throw QueryError.apiError(envelope.errorMessage ?? "Unknown Convex API error")
        } catch let decoding as DecodingError {
            ProfileDebugLog.log("HTTP decode failed (\(path)): \(decoding)")
            throw QueryError.decodeFailed(String(describing: decoding))
        }
    }
}
