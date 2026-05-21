import SwiftUI

/// Placeholder until native booking flow is implemented (opus-mk `/[slug]/book`).
struct BookingPlaceholderView: View {
    let slug: String
    var serviceName: String?

    var body: some View {
        ContentUnavailableView {
            Label("Booking", systemImage: "calendar.badge.plus")
        } description: {
            if let serviceName {
                Text("Online booking for \(serviceName) is coming soon in the app.")
            } else {
                Text("Online booking is coming soon in the app. Use opus.mk to book for now.")
            }
        }
        .navigationTitle("Book")
        .navigationBarTitleDisplayMode(.inline)
    }
}
