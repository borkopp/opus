import SwiftUI

/// On-device debug panel for profile loading (DEBUG only).
struct ProfileDebugOverlay: View {
    let slug: String
    let lines: [String]
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Profile debug")
                .font(.caption.bold())
            Text("slug: \(slug)")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                        Text(line)
                            .font(.system(size: 10, design: .monospaced))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .frame(maxHeight: 220)

            Button("Retry load", action: onRetry)
                .font(.caption)
                .buttonStyle(.bordered)
        }
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .padding()
    }
}
