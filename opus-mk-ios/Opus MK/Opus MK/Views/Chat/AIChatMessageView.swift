import SwiftUI

struct AIChatMessageView: View {
    let message: AIChatMessage

    var body: some View {
        switch message.role {
        case .user: userBubble
        case .assistant: assistantBubble
        }
    }

    // MARK: User

    private var userBubble: some View {
        HStack {
            Spacer(minLength: 60)
            Text(message.content)
                .font(.system(size: 15))
                .foregroundStyle(OpusTheme.fg1)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    OpusTheme.fg1.opacity(0.13),
                    in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                )
        }
    }

    // MARK: Assistant

    private var assistantBubble: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "sparkle")
                .font(.system(size: 12))
                .foregroundStyle(OpusTheme.fg1)
                .frame(width: 28, height: 28)
                .background(OpusTheme.fg1.opacity(0.1), in: Circle())
                .padding(.top, 1)

            VStack(alignment: .leading, spacing: 12) {
                if message.isStreaming && message.content.isEmpty {
                    loadingSkeleton
                } else {
                    messageText
                }

                if !message.isStreaming, let recs = message.recommendations, !recs.isEmpty {
                    VStack(spacing: 8) {
                        ForEach(recs) { rec in
                            AIChatBusinessCardView(rec: rec)
                        }
                    }
                }
            }

            Spacer(minLength: 16)
        }
    }

    private var loadingSkeleton: some View {
        VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 4)
                .fill(OpusTheme.fg1.opacity(0.12))
                .frame(width: 160, height: 12)
            RoundedRectangle(cornerRadius: 4)
                .fill(OpusTheme.fg1.opacity(0.08))
                .frame(width: 220, height: 12)
        }
        .padding(.top, 4)
        .shimmering()
    }

    private var messageText: some View {
        HStack(alignment: .lastTextBaseline, spacing: 0) {
            Group {
                if let attributed = try? AttributedString(markdown: message.content) {
                    Text(attributed)
                } else {
                    Text(message.content)
                }
            }
            .font(.system(size: 15))
            .foregroundStyle(OpusTheme.fg1)
            .frame(maxWidth: .infinity, alignment: .leading)

            if message.isStreaming {
                BlinkingCursor()
            }
        }
    }
}

// MARK: - Blinking cursor

private struct BlinkingCursor: View {
    @State private var visible = true

    var body: some View {
        Rectangle()
            .fill(OpusTheme.fg1.opacity(0.7))
            .frame(width: 2, height: 16)
            .opacity(visible ? 1 : 0)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
                    visible = false
                }
            }
    }
}

// MARK: - Shimmer modifier

private struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay(
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0),
                        .init(color: .white.opacity(0.08), location: 0.4),
                        .init(color: .white.opacity(0.15), location: 0.5),
                        .init(color: .white.opacity(0.08), location: 0.6),
                        .init(color: .clear, location: 1),
                    ],
                    startPoint: .init(x: phase, y: 0.5),
                    endPoint: .init(x: phase + 1, y: 0.5)
                )
                .animation(.linear(duration: 1.2).repeatForever(autoreverses: false), value: phase)
            )
            .onAppear { phase = 1 }
    }
}

private extension View {
    func shimmering() -> some View {
        modifier(ShimmerModifier())
    }
}
