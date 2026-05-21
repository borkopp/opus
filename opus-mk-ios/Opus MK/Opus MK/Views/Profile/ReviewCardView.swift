import SwiftUI

struct ReviewCardView: View {
    let review: OrgReview

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                reviewerAvatar
                VStack(alignment: .leading, spacing: 4) {
                    Text(review.reviewerName)
                        .font(.subheadline.weight(.semibold))
                    HStack(spacing: 6) {
                        starRow
                        Text(RelativeTime.ago(from: review.createdAt))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if let body = review.body, !body.isEmpty {
                Text(body)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
            }

            if let reply = review.reply, !reply.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Text("Owner response")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        if let repliedAt = review.repliedAt {
                            Text("· \(RelativeTime.ago(from: repliedAt))")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                    }
                    Text(reply)
                        .font(.subheadline)
                }
                .padding(.leading, 12)
                .overlay(alignment: .leading) {
                    Rectangle()
                        .fill(Color.accentColor.opacity(0.35))
                        .frame(width: 2)
                }
            }
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(.quaternary, lineWidth: 1)
        )
    }

    @ViewBuilder
    private var reviewerAvatar: some View {
        if let url = AppConfig.mediaURL(for: review.reviewerAvatarUrl) {
            AsyncImage(url: url) { phase in
                if case .success(let image) = phase {
                    image.resizable().scaledToFill()
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 36, height: 36)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(.quaternary)
            .frame(width: 36, height: 36)
            .overlay {
                Text(review.reviewerName.prefix(1).uppercased())
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
    }

    private var starRow: some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: star <= review.rating ? "star.fill" : "star")
                    .font(.caption2)
                    .foregroundStyle(star <= review.rating ? Color.yellow : Color.gray.opacity(0.35))
            }
        }
    }
}
