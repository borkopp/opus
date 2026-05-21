import MapKit
import UIKit

enum MapDirections {
    static func isAvailable(for profile: PublicProfile) -> Bool {
        profile.coordinates != nil
            || !(profile.address?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
    }

    @MainActor
    static func open(for profile: PublicProfile) {
        if let coordinates = profile.coordinates {
            let placemark = MKPlacemark(
                coordinate: CLLocationCoordinate2D(
                    latitude: coordinates.lat,
                    longitude: coordinates.lng
                )
            )
            let item = MKMapItem(placemark: placemark)
            item.name = profile.name
            item.openInMaps(launchOptions: [
                MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving,
            ])
            return
        }

        let parts = [profile.address, profile.locationLine]
            .compactMap { $0 }
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard !parts.isEmpty else { return }

        let query = parts.joined(separator: ", ")
        guard let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "http://maps.apple.com/?daddr=\(encoded)")
        else { return }

        UIApplication.shared.open(url)
    }
}
