import ClerkKit
import ClerkKitUI
import SwiftUI

struct RootView: View {
    @Environment(Clerk.self) private var clerk
    @State private var authIsPresented = false

    var body: some View {
        TabView {
            AIChatView()
                .tabItem {
                    Label("Ask", systemImage: "sparkle")
                }

            DiscoverView()
                .tabItem {
                    Label("Discover", systemImage: "safari")
                }
        }
        .tint(OpusTheme.accent)
        .sheet(isPresented: $authIsPresented) {
            AuthView()
        }
    }

    private var bookingsTab: some View {
        NavigationStack {
            Group {
                if clerk.user != nil {
                    ContentUnavailableView(
                        "My Bookings",
                        systemImage: "calendar",
                        description: Text("Your bookings will appear here.")
                    )
                } else {
                    ContentUnavailableView {
                        Label("Sign In Required", systemImage: "person.crop.circle")
                    } description: {
                        Text("Sign in to see your OPUS bookings.")
                    } actions: {
                        Button("Sign In") { authIsPresented = true }
                    }
                }
            }
            .navigationTitle("Bookings")
        }
    }
}

#Preview {
    RootView()
        .environment(Clerk.shared)
}
