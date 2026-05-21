import Foundation

enum OpeningHoursHelper {
    /// Mirrors opus-mk `isOpenNow` (Europe/Belgrade, ISO weekday 0=Mon).
    static func isOpenNow(
        _ openingHours: [OpeningHoursEntry]?,
        now: Date = Date()
    ) -> Bool {
        guard let openingHours, !openingHours.isEmpty else { return false }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Belgrade") ?? .current

        let weekday = calendar.component(.weekday, from: now)
        let currentDay = weekday == 1 ? 6 : weekday - 2

        let hour = calendar.component(.hour, from: now)
        let minute = calendar.component(.minute, from: now)
        let currentMinutes = hour * 60 + minute

        guard let today = openingHours.first(where: { $0.dayOfWeek == currentDay }),
              !today.isClosed
        else { return false }

        let openMins = minutes(from: today.open)
        let closeMins = minutes(from: today.close)

        if closeMins > openMins {
            return currentMinutes >= openMins && currentMinutes < closeMins
        }
        return currentMinutes >= openMins || currentMinutes < closeMins
    }

    private static func minutes(from time: String) -> Int {
        let parts = time.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return 0 }
        return parts[0] * 60 + parts[1]
    }
}

enum DayPeriod {
    static var label: String {
        let now = Date()
        var calendar = Calendar.current
        calendar.timeZone = TimeZone(identifier: "Europe/Belgrade") ?? .current
        let dayIndex = calendar.component(.weekday, from: now) - 1
        let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        let day = days[dayIndex]
        let hour = calendar.component(.hour, from: now)
        if hour < 12 { return "\(day) morning" }
        if hour < 17 { return "\(day) afternoon" }
        return "\(day) evening"
    }
}
