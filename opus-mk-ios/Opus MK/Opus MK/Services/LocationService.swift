import CoreLocation
import Foundation

/// Requests one-shot "when in use" location and reverse-geocodes it to a city name.
/// Mirrors the web `useResolveCity` + `useUserLocation` hooks.
@MainActor
@Observable
final class LocationService: NSObject {
    enum State {
        case idle, requesting, granted, denied, unavailable
    }

    private(set) var state: State = .idle
    private(set) var coords: CLLocationCoordinate2D?
    private(set) var city: String?

    private let manager = CLLocationManager()
    private let geocoder = CLGeocoder()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    func requestIfNeeded() {
        switch manager.authorizationStatus {
        case .notDetermined:
            state = .requesting
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            startOneShotFetch()
        case .denied, .restricted:
            state = .denied
        @unknown default:
            state = .unavailable
        }
    }

    private func startOneShotFetch() {
        guard state != .granted else { return }
        state = .requesting
        manager.requestLocation()
    }

    private func resolveCity(from location: CLLocation) {
        Task {
            do {
                let placemarks = try await geocoder.reverseGeocodeLocation(location)
                // Prefer locality (city), fall back to administrativeArea (region)
                city = placemarks.first?.locality ?? placemarks.first?.administrativeArea
            } catch {
                // City stays nil — the view shows a fallback state
            }
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationService: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            switch manager.authorizationStatus {
            case .authorizedWhenInUse, .authorizedAlways:
                startOneShotFetch()
            case .denied, .restricted:
                state = .denied
            default:
                break
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in
            coords = location.coordinate
            state = .granted
            resolveCity(from: location)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            let clError = error as? CLError
            if clError?.code == .denied {
                state = .denied
            } else {
                state = .unavailable
            }
        }
    }
}
