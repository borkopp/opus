import MapKit
import SwiftUI

struct BusinessProfileView: View {
    let slug: String
    @State private var viewModel: BusinessProfileViewModel

    init(slug: String) {
        self.slug = slug
        _viewModel = State(initialValue: BusinessProfileViewModel(slug: slug))
    }

    var body: some View {
        Group {
            if viewModel.isLoadingProfile && viewModel.profile == nil {
                ZStack(alignment: .bottom) {
                    ProgressView("Loading business…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    #if DEBUG
                    ProfileDebugOverlay(
                        slug: slug,
                        lines: viewModel.debugLines,
                        onRetry: { viewModel.retry() }
                    )
                    #endif
                }
            } else if viewModel.profile == nil {
                VStack(spacing: 16) {
                    ContentUnavailableView(
                        "Business Not Found",
                        systemImage: "building.2",
                        description: Text(viewModel.errorMessage ?? "This listing may have been removed.")
                    )
                    #if DEBUG
                    ProfileDebugOverlay(
                        slug: slug,
                        lines: viewModel.debugLines,
                        onRetry: { viewModel.retry() }
                    )
                    #endif
                }
            } else if let profile = viewModel.profile {
                profileContent(profile)
            }
        }
        .navigationTitle(viewModel.profile?.name ?? "Business")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: slug) {
            await viewModel.load()
        }
        .onDisappear { viewModel.cancel() }
    }

    @ViewBuilder
    private func profileContent(_ profile: PublicProfile) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                coverSection(profile)
                VStack(alignment: .leading, spacing: 24) {
                    headerSection(profile)
                    heroActionsSection(profile)
                    contactSection(profile)
                    gallerySection(profile)
                    aboutSection(profile)
                    industrySection(profile)
                    reviewsSection(profile)
                    mapSection(profile)
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
                .padding(.top, profile.coverMedia != nil ? -40 : 16)
            }
        }
    }

    @ViewBuilder
    private func coverSection(_ profile: PublicProfile) -> some View {
        if let cover = profile.coverMedia,
           let url = AppConfig.mediaURL(for: cover.url)
        {
            AsyncImage(url: url) { phase in
                if case .success(let image) = phase {
                    image.resizable().scaledToFill()
                } else {
                    Rectangle().fill(.quaternary)
                }
            }
            .frame(height: 220)
            .frame(maxWidth: .infinity)
            .clipped()
            .overlay(alignment: .bottom) {
                LinearGradient(
                    colors: [.clear, Color(uiColor: .systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 80)
            }
        }
    }

    private func headerSection(_ profile: PublicProfile) -> some View {
        HStack(alignment: .top, spacing: 16) {
            logoView(profile)
            VStack(alignment: .leading, spacing: 6) {
                Text(profile.name)
                    .font(.title2.bold())
                if let tagline = profile.tagline, !tagline.isEmpty {
                    Text(tagline)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 16) {
                    if let rating = profile.averageRating, rating > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .foregroundStyle(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(.subheadline.weight(.semibold))
                            if let count = profile.reviewCount, count > 0 {
                                Text("(\(count))")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    if let location = profile.locationLine {
                        Label(location, systemImage: "mappin.and.ellipse")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func logoView(_ profile: PublicProfile) -> some View {
        if let url = AppConfig.mediaURL(for: profile.logoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                default:
                    // Keep the reserved space so the header doesn't jump when
                    // the image arrives.
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(.quaternary)
                }
            }
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    @ViewBuilder
    private func contactSection(_ profile: PublicProfile) -> some View {
        let hasSocial = profile.instagramHandle != nil || profile.websiteUrl != nil
        if hasSocial {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    if let handle = profile.instagramHandle {
                        Link(destination: URL(string: "https://instagram.com/\(handle)")!) {
                            Label("Instagram", systemImage: "camera")
                        }
                        .buttonStyle(.bordered)
                    }
                    if let website = profile.websiteUrl, let url = URL(string: website) {
                        Link(destination: url) {
                            Label("Website", systemImage: "globe")
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func gallerySection(_ profile: PublicProfile) -> some View {
        if !profile.galleryMedia.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                sectionTitle("Gallery")
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(profile.galleryMedia) { item in
                            if let url = AppConfig.mediaURL(for: item.url) {
                                AsyncImage(url: url) { phase in
                                    if case .success(let image) = phase {
                                        image.resizable().scaledToFill()
                                    } else {
                                        Rectangle().fill(.quaternary)
                                    }
                                }
                                .frame(width: 180, height: 180)
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                            }
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func aboutSection(_ profile: PublicProfile) -> some View {
        if let bio = profile.bio, !bio.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("About")
                Text(bio)
                    .font(.body)
            }
        }
    }

    @ViewBuilder
    private func industrySection(_ profile: PublicProfile) -> some View {
        if profile.isHospitality {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("Details")
                HospitalityProfileSection(profile: profile)
            }
        } else if !profile.services.isEmpty {
            VStack(alignment: .leading, spacing: 16) {
                sectionTitle("Services")
                ForEach(profile.servicesByCategory, id: \.name) { group in
                    VStack(alignment: .leading, spacing: 10) {
                        if profile.servicesByCategory.count > 1 {
                            Text(group.name.uppercased())
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)
                        }
                        ForEach(group.services) { service in
                            NavigationLink {
                                BookingPlaceholderView(slug: slug, serviceName: service.name)
                            } label: {
                                ServiceRowView(service: service)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func reviewsSection(_ profile: PublicProfile) -> some View {
        if !viewModel.reviews.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    sectionTitle("Reviews")
                    Spacer()
                    if let rating = profile.averageRating, rating > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .foregroundStyle(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(.subheadline.weight(.semibold))
                        }
                    }
                }
                ForEach(viewModel.reviews) { review in
                    ReviewCardView(review: review)
                }
            }
        }
    }

    @ViewBuilder
    private func mapSection(_ profile: PublicProfile) -> some View {
        if let coordinates = profile.coordinates {
            VStack(alignment: .leading, spacing: 12) {
                sectionTitle("Location")
                BusinessMapView(
                    name: profile.name,
                    coordinates: coordinates,
                    address: profile.address,
                    cityLine: profile.locationLine
                )
            }
        }
    }

    /// Full-width hero CTAs (matches opus-mk sticky Book Now: h-14, rounded-2xl, cta fill).
    @ViewBuilder
    private func heroActionsSection(_ profile: PublicProfile) -> some View {
        let showBook = !profile.isHospitality
        let showCall = profile.phone != nil
        let showDirections = MapDirections.isAvailable(for: profile)

        if showBook || showCall || showDirections {
            VStack(spacing: 12) {
                if showBook {
                    NavigationLink {
                        BookingPlaceholderView(slug: slug)
                    } label: {
                        heroButtonLabel(title: "Book Now")
                    }
                    .heroCTAStyle()
                }

                if showCall, let phone = profile.phone,
                   let url = phoneURL(phone)
                {
                    Link(destination: url) {
                        heroButtonLabel(title: "Call", systemImage: "phone.fill")
                    }
                    .heroCTAStyle()
                }

                if showDirections {
                    Button {
                        MapDirections.open(for: profile)
                    } label: {
                        heroButtonLabel(
                            title: "Get Directions",
                            systemImage: "arrow.triangle.turn.up.right.diamond.fill"
                        )
                    }
                    .heroCTAStyle()
                }
            }
        }
    }

    private func heroButtonLabel(title: String, systemImage: String? = nil) -> some View {
        HStack(spacing: 8) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.body.weight(.semibold))
            }
            Text(title)
                .font(.system(size: 17, weight: .bold))
        }
        .frame(maxWidth: .infinity)
        .frame(height: 56)
    }

    private func phoneURL(_ phone: String) -> URL? {
        let digits = phone.filter { $0.isNumber || $0 == "+" }
        guard !digits.isEmpty else { return nil }
        return URL(string: "tel:\(digits)")
    }

    private func sectionTitle(_ title: String) -> some View {
        Text(title)
            .font(.title3.bold())
    }
}

// MARK: - Hero CTA (opus-mk Book Now style)

private extension View {
    func heroCTAStyle() -> some View {
        buttonStyle(.borderedProminent)
            .tint(OpusTheme.cta)
            .buttonBorderShape(.roundedRectangle(radius: 16))
    }
}

#Preview {
    NavigationStack {
        BusinessProfileView(slug: "test")
    }
}
