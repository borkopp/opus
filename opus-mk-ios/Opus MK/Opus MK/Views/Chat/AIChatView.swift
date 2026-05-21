import SwiftUI

struct AIChatView: View {
    @State private var viewModel = AIChatViewModel()
    @FocusState private var inputFocused: Bool
    @State private var navigationPath = NavigationPath()

    var body: some View {
        NavigationStack(path: $navigationPath) {
            VStack(spacing: 0) {
                header

                if viewModel.messages.isEmpty {
                    heroContent
                } else {
                    messagesContent
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background { backgroundLayer }
            .contentShape(Rectangle())
            .onTapGesture { inputFocused = false }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if navigationPath.isEmpty {
                    inputRow
                        .padding(.horizontal, 20)
                        .padding(.top, 12)
                        .padding(.bottom, 8)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: BusinessProfileRoute.self) { route in
                BusinessProfileView(slug: route.slug)
            }
        }
        .task { viewModel.startLocation() }
        .onDisappear { viewModel.cancelStream() }
    }

    // MARK: Background

    private var backgroundLayer: some View {
        let chatActive = !viewModel.messages.isEmpty
        return ZStack {
            Color.black

            Image("AbstractBackground")
                .resizable()
                .scaledToFill()
                .opacity(chatActive ? 0.2 : 0.9)
                .animation(.easeInOut(duration: 1), value: chatActive)

            LinearGradient(
                stops: [
                    .init(color: .black.opacity(0.28), location: 0),
                    .init(color: .clear, location: 0.28),
                    .init(color: .clear, location: 0.50),
                    .init(color: .black.opacity(0.72), location: 0.72),
                    .init(color: .black.opacity(0.97), location: 1),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .opacity(chatActive ? 0 : 1)
            .animation(.easeInOut(duration: 1), value: chatActive)

            Color.black.opacity(chatActive ? 0.4 : 0)
                .animation(.easeInOut(duration: 1), value: chatActive)
        }
        .ignoresSafeArea()
    }

    // MARK: Header

    private var header: some View {
        HStack {
            Text("OPUS")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(.white.opacity(0.9))

            Spacer()

            locationPill
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }

    @ViewBuilder
    private var locationPill: some View {
        switch viewModel.location.state {
        case .idle, .requesting:
            HStack(spacing: 6) {
                ProgressView()
                    .progressViewStyle(.circular)
                    .scaleEffect(0.6)
                    .tint(.white.opacity(0.6))
                Text("Locating…")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.6))
            }
            .pillStyle()

        case .granted:
            if let city = viewModel.cityLabel {
                HStack(spacing: 6) {
                    Circle()
                        .fill(OpusTheme.online)
                        .frame(width: 6, height: 6)
                        .shadow(color: OpusTheme.online.opacity(0.8), radius: 3)
                    Text(city)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.85))
                }
                .pillStyle()
            } else {
                HStack(spacing: 6) {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .scaleEffect(0.6)
                        .tint(.white.opacity(0.6))
                    Text("Resolving city…")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .pillStyle()
            }

        case .denied, .unavailable:
            HStack(spacing: 5) {
                Image(systemName: "location.slash")
                    .font(.system(size: 10))
                Text("Location off")
                    .font(.caption)
            }
            .foregroundStyle(.white.opacity(0.4))
            .pillStyle(opacity: 0.3, borderOpacity: 0.06)
        }
    }

    // MARK: Hero content

    private var heroContent: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(alignment: .leading, spacing: 14) {
                Text(viewModel.dayPeriodLabel.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .tracking(3)
                    .foregroundStyle(OpusTheme.accent2)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(.white.opacity(0.05), in: Capsule())
                    .overlay(Capsule().strokeBorder(.white.opacity(0.08)))

                VStack(alignment: .leading, spacing: 2) {
                    Text("Where do you want to")
                        .font(.system(size: 30, weight: .medium))
                        .foregroundStyle(.white)
                    Text(viewModel.heroTail)
                        .font(.system(size: 30, weight: .medium).italic())
                        .foregroundStyle(OpusTheme.accent)
                }

                // Suggestion pills sit directly below the headline so they are
                // always visible above the input dock, never hidden behind it.
                suggestionChips
                    .padding(.top, 4)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
    }

    // MARK: Messages content

    private var messagesContent: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 20) {
                    ForEach(viewModel.messages) { msg in
                        AIChatMessageView(message: msg)
                            .id(msg.id)
                    }
                }
                .padding(16)
                .padding(.bottom, 4)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: viewModel.messages.count) { _, _ in scrollToBottom(proxy) }
            .onChange(of: viewModel.messages.last?.content) { _, _ in scrollToBottom(proxy) }
        }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        guard let last = viewModel.messages.last else { return }
        withAnimation(.easeOut(duration: 0.2)) {
            proxy.scrollTo(last.id, anchor: .bottom)
        }
    }

    // MARK: Suggestion chips

    private var suggestionChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(AIChatViewModel.suggestions, id: \.label) { s in
                    Button {
                        inputFocused = false
                        viewModel.send(s.query)
                    } label: {
                        Text(s.label)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.white.opacity(viewModel.canSend ? 0.9 : 0.4))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 7)
                            .background(.white.opacity(0.10), in: Capsule())
                            .overlay(Capsule().strokeBorder(.white.opacity(0.16)))
                    }
                    .disabled(!viewModel.canSend)
                }
            }
        }
    }

    // MARK: Input row

    private var inputRow: some View {
        let active = !viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty && viewModel.canSend

        return HStack(alignment: .bottom, spacing: 8) {
            // TextField in a rounded pill
            HStack(alignment: .bottom, spacing: 8) {
                Image(systemName: "sparkle")
                    .font(.system(size: 14))
                    .foregroundStyle(OpusTheme.accentSoft)
                    .padding(.bottom, 2)

                TextField(
                    text: $viewModel.inputText,
                    prompt: Text(composerPlaceholder).foregroundStyle(.white.opacity(0.45)),
                    axis: .vertical
                ) {
                    Text(composerPlaceholder)
                }
                .lineLimit(1...5)
                .foregroundStyle(.white)
                .tint(OpusTheme.accent)
                .focused($inputFocused)
                .submitLabel(.send)
                .onSubmit {
                    inputFocused = false
                    viewModel.sendCurrentInput()
                }
                .disabled(!viewModel.canSend)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 22)
                    .fill(.white.opacity(0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 22)
                            .strokeBorder(.white.opacity(inputFocused ? 0.22 : 0.10))
                            .animation(.easeInOut(duration: 0.2), value: inputFocused)
                    )
            )

            // Send button — native-feeling filled circle arrow
            Button {
                inputFocused = false
                viewModel.sendCurrentInput()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 34))
                    .foregroundStyle(active ? OpusTheme.accent : Color.white.opacity(0.2))
                    .animation(.easeInOut(duration: 0.15), value: active)
            }
            .disabled(!active)
        }
    }

    private var composerPlaceholder: String {
        if viewModel.isLoading { return "Thinking…" }
        switch viewModel.location.state {
        case .idle, .requesting: return "Resolving location…"
        case .granted where viewModel.cityLabel == nil: return "Resolving city…"
        case .denied, .unavailable: return "Location required to find nearby places"
        default: return "Ask anything — 'date night tonight'…"
        }
    }
}

// MARK: - Pill style helper

private extension View {
    func pillStyle(opacity: Double = 0.4, borderOpacity: Double = 0.10) -> some View {
        self
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(.black.opacity(opacity), in: Capsule())
            .overlay(Capsule().strokeBorder(.white.opacity(borderOpacity)))
    }
}

#Preview {
    AIChatView()
}
