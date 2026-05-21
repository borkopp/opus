import Foundation

enum AIChatService {
    struct Coords: Encodable {
        let lat: Double
        let lng: Double
    }

    struct ChatRequest: Encodable {
        let query: String
        let sessionId: String
        let city: String
        let locale: String
        let coords: Coords?
    }

    enum SSEEvent {
        case text(String)
        case recommendations([AIChatRecommendation])
        case done
        case error(String)
    }

    static func stream(
        _ chatRequest: ChatRequest,
        baseURL: String
    ) -> AsyncThrowingStream<SSEEvent, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                guard let url = URL(string: "\(baseURL)/api/chat") else {
                    continuation.finish(throwing: URLError(.badURL))
                    return
                }

                var urlRequest = URLRequest(url: url)
                urlRequest.httpMethod = "POST"
                urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
                urlRequest.timeoutInterval = 120
                urlRequest.httpBody = try? JSONEncoder().encode(chatRequest)

                do {
                    let (asyncBytes, response) = try await URLSession.shared.bytes(for: urlRequest)

                    guard let http = response as? HTTPURLResponse,
                          (200...299).contains(http.statusCode) else {
                        continuation.finish(throwing: URLError(.badServerResponse))
                        return
                    }

                    for try await line in asyncBytes.lines {
                        if Task.isCancelled { break }
                        guard line.hasPrefix("data: ") else { continue }
                        let raw = String(line.dropFirst(6)).trimmingCharacters(in: .whitespaces)
                        guard !raw.isEmpty, raw != "[DONE]" else { continue }

                        guard let data = raw.data(using: .utf8),
                              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                              let type = json["type"] as? String else { continue }

                        switch type {
                        case "text":
                            if let text = json["text"] as? String {
                                continuation.yield(.text(text))
                            }
                        case "recommendations":
                            if let recData = try? JSONSerialization.data(withJSONObject: json["data"] as Any),
                               let recs = try? JSONDecoder().decode([AIChatRecommendation].self, from: recData) {
                                continuation.yield(.recommendations(recs))
                            }
                        case "done":
                            continuation.yield(.done)
                        case "error":
                            let msg = json["message"] as? String ?? "Unknown error"
                            continuation.yield(.error(msg))
                        default:
                            break
                        }
                    }

                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }

            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
