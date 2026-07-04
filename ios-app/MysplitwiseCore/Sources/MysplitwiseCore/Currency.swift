import Foundation

/// Static currency table + conversion — port of `src/lib/currency.ts`. Rates are
/// fixed at build time (no live-rate API call), matching the web app.
public struct CurrencyInfo {
    public let code: String
    public let symbol: String
    public let name: String
    /// Units of this currency per 1 USD.
    public let rate: Double
}

public enum Currency {
    public static let all: [CurrencyInfo] = [
        CurrencyInfo(code: "USD", symbol: "$", name: "US Dollar", rate: 1),
        CurrencyInfo(code: "EUR", symbol: "€", name: "Euro", rate: 0.92),
        CurrencyInfo(code: "GBP", symbol: "£", name: "British Pound", rate: 0.79),
        CurrencyInfo(code: "INR", symbol: "₹", name: "Indian Rupee", rate: 83.2),
        CurrencyInfo(code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 156),
        CurrencyInfo(code: "CAD", symbol: "C$", name: "Canadian Dollar", rate: 1.36),
        CurrencyInfo(code: "AUD", symbol: "A$", name: "Australian Dollar", rate: 1.51),
        CurrencyInfo(code: "MXN", symbol: "Mex$", name: "Mexican Peso", rate: 17.1),
        CurrencyInfo(code: "BRL", symbol: "R$", name: "Brazilian Real", rate: 5.05),
        CurrencyInfo(code: "SGD", symbol: "S$", name: "Singapore Dollar", rate: 1.35),
        CurrencyInfo(code: "CHF", symbol: "CHF", name: "Swiss Franc", rate: 0.9),
        CurrencyInfo(code: "CNY", symbol: "¥", name: "Chinese Yuan", rate: 7.24),
        CurrencyInfo(code: "AED", symbol: "د.إ", name: "UAE Dirham", rate: 3.67),
        CurrencyInfo(code: "ZAR", symbol: "R", name: "South African Rand", rate: 18.6),
    ]

    private static let byCode: [String: CurrencyInfo] = Dictionary(uniqueKeysWithValues: all.map { ($0.code, $0) })
    private static let zeroDecimal: Set<String> = ["JPY", "CNY"]

    public static func get(_ code: String) -> CurrencyInfo {
        byCode[code] ?? byCode["USD"]!
    }

    /// Converts `amount` from `from` to `to` via USD as an intermediate. No
    /// rounding is applied here — round the result yourself if displaying it.
    public static func convert(_ amount: Double, from: String, to: String) -> Double {
        guard from != to else { return amount }
        let f = get(from).rate
        let t = get(to).rate
        return (amount / f) * t
    }

    /// Matches the web's `formatMoney`: absolute value with US-locale grouping,
    /// a leading "-" for negative amounts, and the currency symbol prefixed —
    /// every currency (including AED/ZAR) is formatted the same way; the web
    /// source has a comment suggesting AED/ZAR should read symbol-after-number,
    /// but both its code branches are identical, so this replicates the actual
    /// (symbol-always-first) behavior rather than the unimplemented intent.
    public static func formatMoney(_ amount: Double, code: String = "USD") -> String {
        let currency = get(code)
        let decimals = zeroDecimal.contains(code) ? 0 : 2
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "en_US")
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = decimals
        formatter.maximumFractionDigits = decimals
        formatter.groupingSeparator = ","
        formatter.decimalSeparator = "."
        // Explicit (not left to NumberFormatter's default .halfEven) to match JS's
        // round-half-away-from-zero. Safe here since we always format `abs(amount)`.
        formatter.roundingMode = .halfUp
        let str = formatter.string(from: NSNumber(value: abs(amount))) ?? String(format: "%.\(decimals)f", abs(amount))
        let sign = amount < 0 ? "-" : ""
        return "\(sign)\(currency.symbol)\(str)"
    }
}
