import SwiftUI

/// OPUS marketplace tokens (aligned with opus-mk `globals.css` dark mode).
enum OpusTheme {
    static let accent = Color(red: 225 / 255, green: 99 / 255, blue: 73 / 255)
    static let accent2 = Color(red: 225 / 255, green: 125 / 255, blue: 97 / 255, opacity: 0.9)
    static let accentSoft = Color(red: 244 / 255, green: 160 / 255, blue: 122 / 255)
    static let bg0 = Color.black
    static let bg1 = Color(red: 14 / 255, green: 14 / 255, blue: 14 / 255)
    static let card = Color(red: 18 / 255, green: 18 / 255, blue: 18 / 255)
    static let secondary = Color(red: 24 / 255, green: 24 / 255, blue: 24 / 255)
    static let fg1 = Color(red: 250 / 255, green: 249 / 255, blue: 247 / 255)
    static let fg2 = Color(red: 199 / 255, green: 195 / 255, blue: 188 / 255)
    static let fg3 = Color(red: 138 / 255, green: 134 / 255, blue: 128 / 255)
    static let mutedFg = Color(red: 165 / 255, green: 160 / 255, blue: 154 / 255)
    static let border = Color.white.opacity(0.10)
    static let borderSubtle = Color.white.opacity(0.05)
    static let rating = Color(red: 1.0, green: 0.82, blue: 0.45)
    static let success = Color(red: 62 / 255, green: 207 / 255, blue: 142 / 255)
    static let online = Color(red: 62 / 255, green: 207 / 255, blue: 91 / 255)
    static let cta = Color(red: 225 / 255, green: 99 / 255, blue: 73 / 255)
    static let floatNavBg = Color(red: 28 / 255, green: 27 / 255, blue: 25 / 255, opacity: 0.93)

    static let coverCardWidth: CGFloat = 220
    static let coverCardHeight: CGFloat = 275
}
