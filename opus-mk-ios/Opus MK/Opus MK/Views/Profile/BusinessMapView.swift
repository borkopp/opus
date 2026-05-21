import MapKit
import SwiftUI

struct BusinessMapView: View {
    let name: String
    let coordinates: Coordinates
    let addressLine: String?

    @State private var position: MapCameraPosition

    init(name: String, coordinates: Coordinates, address: String?, cityLine: String?) {
        self.name = name
        self.coordinates = coordinates
        self.addressLine = [address, cityLine].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: coordinates.lat, longitude: coordinates.lng),
            span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
        )
        _position = State(initialValue: .region(region))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Map(position: $position) {
                Marker(name, coordinate: CLLocationCoordinate2D(
                    latitude: coordinates.lat,
                    longitude: coordinates.lng
                ))
            }
            .frame(height: 220)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            if let addressLine, !addressLine.isEmpty {
                Label(addressLine, systemImage: "mappin.and.ellipse")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
