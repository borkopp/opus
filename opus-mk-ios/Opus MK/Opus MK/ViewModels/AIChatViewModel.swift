import CoreLocation
import Foundation
import SwiftUI

@MainActor
@Observable
final class AIChatViewModel {
    var messages: [AIChatMessage] = []
    var inputText = ""
    var isLoading = false

    let location = LocationService()

    static let suggestions: [(label: String, query: String)] = [
        (label: "Date night 🌙", query: "date night with my girlfriend tonight"),
        (label: "Quick haircut 💈", query: "haircut available now"),
        (label: "Relaxing spa 🧖", query: "couples spa this evening"),
        (label: "Birthday treat 🎂", query: "birthday pampering today"),
    ]

    private let sessionId: String = {
        let key = "ai_chat_session_id"
        if let existing = UserDefaults.standard.string(forKey: key) { return existing }
        let new = UUID().uuidString
        UserDefaults.standard.set(new, forKey: key)
        return new
    }()

    private var streamTask: Task<Void, Never>?

    var dayPeriodLabel: String {
        let h = Calendar.current.component(.hour, from: Date())
        let day = Calendar.current.weekdaySymbols[Calendar.current.component(.weekday, from: Date()) - 1]
        if h < 12 { return "\(day) morning" }
        if h < 17 { return "\(day) afternoon" }
        return "\(day) evening"
    }

    var heroTail: String {
        let h = Calendar.current.component(.hour, from: Date())
        if h < 12 { return "go this morning?" }
        if h < 17 { return "go this afternoon?" }
        return "go tonight?"
    }

    /// The city label shown in the header pill.
    var cityLabel: String? { location.city }

    /// True while we have a city and can accept queries.
    var canSend: Bool { location.city != nil && !isLoading }

    func startLocation() {
        location.requestIfNeeded()
    }

    func sendCurrentInput() {
        let trimmed = inputText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        inputText = ""
        send(trimmed)
    }

    func send(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !isLoading else { return }
        guard let city = location.city else { return }

        messages.append(.user(content: trimmed))

        let assistantId = UUID().uuidString
        messages.append(.assistant(id: assistantId))
        isLoading = true

        streamTask?.cancel()
        streamTask = Task {
            defer { isLoading = false }

            let coords: AIChatService.Coords? = location.coords.map {
                AIChatService.Coords(lat: $0.latitude, lng: $0.longitude)
            }

            let request = AIChatService.ChatRequest(
                query: trimmed,
                sessionId: sessionId,
                city: city,
                locale: "en",
                coords: coords
            )

            var streamedText = ""

            do {
                for try await event in AIChatService.stream(request, baseURL: AppConfig.opusMkBaseURL) {
                    if Task.isCancelled { break }
                    switch event {
                    case .text(let chunk):
                        streamedText += chunk
                        update(id: assistantId) { $0.content = streamedText }
                    case .recommendations(let recs):
                        update(id: assistantId) { $0.recommendations = recs }
                    case .done:
                        update(id: assistantId) { $0.isStreaming = false }
                    case .error(let msg):
                        update(id: assistantId) {
                            $0.content = msg
                            $0.isStreaming = false
                        }
                    }
                }
            } catch {
                update(id: assistantId) {
                    $0.content = "Something went wrong. Please try again."
                    $0.isStreaming = false
                }
            }
        }
    }

    func cancelStream() {
        streamTask?.cancel()
        streamTask = nil
    }

    private func update(id: String, _ mutate: (inout AIChatMessage) -> Void) {
        guard let idx = messages.firstIndex(where: { $0.id == id }) else { return }
        mutate(&messages[idx])
    }
}
