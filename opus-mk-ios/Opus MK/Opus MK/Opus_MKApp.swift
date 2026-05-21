//
//  Opus_MKApp.swift
//  Opus MK
//

import ClerkKit
import SwiftUI

@main
struct Opus_MKApp: App {
    init() {
        _ = ConvexEnvironment.shared
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(Clerk.shared)
        }
    }
}
