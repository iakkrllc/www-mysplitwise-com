import Foundation

/// Cent-accurate splitting primitives — ports of `src/lib/split.ts`. All money math
/// happens in integer cents to avoid floating-point drift, matching the web app
/// exactly so a native-computed split always matches what the server stores.
public enum Split {
    /// Distribute `amount` across `n` participants as evenly as possible, cent-accurate.
    /// The remainder (if amount*100 doesn't divide evenly by n) goes one-each to the
    /// first `rem` participants in order — deterministic, not random.
    public static func equal(amount: Double, n: Int) -> [Double] {
        guard n > 0 else { return [] }
        let cents = Int(jsRound(amount * 100))
        let base = cents / n
        let rem = cents - base * n
        return (0..<n).map { i in
            Double(base + (i < rem ? 1 : 0)) / 100
        }
    }

    /// Distribute `amount` by percentages (which should sum to 100), cent-accurate.
    /// Each percentage's cent share is rounded independently, then any rounding
    /// drift is corrected by walking the array round-robin from index 0, adding or
    /// subtracting one cent per step until the drift reaches zero.
    public static func byPercent(amount: Double, percents: [Double]) -> [Double] {
        let cents = Int(jsRound(amount * 100))
        var rounded = percents.map { p in Int(jsRound(Double(cents) * p / 100)) }
        var diff = cents - rounded.reduce(0, +)
        var i = 0
        while diff != 0 && !rounded.isEmpty {
            let idx = i % rounded.count
            rounded[idx] += diff > 0 ? 1 : -1
            diff += diff > 0 ? -1 : 1
            i += 1
        }
        return rounded.map { Double($0) / 100 }
    }

    /// Distribute `amount` by arbitrary integer/float shares (e.g. 1/1/2).
    public static func byShares(amount: Double, shares: [Double]) -> [Double] {
        let total = shares.reduce(0, +)
        guard total > 0 else { return shares.map { _ in 0 } }
        return byPercent(amount: amount, percents: shares.map { $0 / total * 100 })
    }
}
