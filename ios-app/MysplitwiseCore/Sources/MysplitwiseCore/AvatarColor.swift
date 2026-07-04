import Foundation

/// Deterministic avatar-color assignment — port of `AVATAR_COLORS`/`pickAvatarColor`
/// in `src/lib/store.tsx` (and mirrored server-side in `serialize.ts`). Uses
/// wrapping unsigned-32-bit arithmetic to match JS's `(h * 31 + charCode) >>> 0`
/// bit-for-bit, so the same seed always picks the same color on every platform.
public enum AvatarColor {
    public static let palette: [String] = [
        "#7C3AED", "#FF8A5B", "#6C8AE4", "#C566B5", "#E4694A",
        "#5BA0C5", "#7FB069", "#E4A85B", "#B05BC5", "#5BC5C0",
        "#E45B6E", "#9C7B5A",
    ]

    public static func pick(seed: String) -> String {
        var h: UInt32 = 0
        for scalar in seed.utf16 {
            h = h &* 31 &+ UInt32(scalar)
        }
        return palette[Int(h % UInt32(palette.count))]
    }
}
