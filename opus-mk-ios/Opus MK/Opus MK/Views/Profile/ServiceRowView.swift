import SwiftUI

struct ServiceRowView: View {
    let service: PublicService

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            if let photoUrl = service.photoUrl,
               let url = AppConfig.mediaURL(for: photoUrl)
            {
                AsyncImage(url: url) { phase in
                    if case .success(let image) = phase {
                        image.resizable().scaledToFill()
                    } else {
                        Color.clear
                    }
                }
                .frame(width: 56, height: 56)
                .background(.quaternary)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(service.name)
                    .font(.body.weight(.semibold))
                if let description = service.consumerDescription, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Label("\(service.durationMins) min", systemImage: "clock")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 8)

            Text(PriceFormatting.format(minorUnits: service.priceMinorUnits, currency: service.currency))
                .font(.body.weight(.semibold))

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(.quaternary, lineWidth: 1)
        )
    }
}
