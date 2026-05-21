import ConvexMobile
import Foundation

/// In-memory + console log for profile loading diagnostics.
enum ProfileDebugLog {
    private static let lock = NSLock()
    private(set) static var lines: [String] = []
    private static let maxLines = 40

    /// Shared formatter — DateFormatter is expensive to allocate; reuse it.
    private static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "HH:mm:ss.SSS"
        return f
    }()

    static func clear() {
        lock.withLock { lines = [] }
    }

    static func log(_ message: String) {
        // Build the timestamp outside the lock to keep the critical section short.
        let stamp = lock.withLock { formatter.string(from: Date()) }
        let line = "[\(stamp)] \(message)"
        lock.withLock {
            lines.append(line)
            if lines.count > maxLines {
                lines.removeFirst(lines.count - maxLines)
            }
        }
        print("[Profile] \(message)")
    }

    static func logError(_ message: String, _ error: Error) {
        log("\(message): \(describe(error))")
    }

    static func describe(_ error: Error) -> String {
        if let clientError = error as? ClientError {
            switch clientError {
            case .InternalError(let msg):
                return "ClientError.Internal(\(msg))"
            case .ServerError(let msg):
                return "ClientError.Server(\(msg))"
            case .ConvexError(let data):
                return "ClientError.Convex(\(data))"
            }
        }
        return String(describing: error)
    }

    static func snapshot() -> [String] {
        lock.withLock { lines }
    }
}
