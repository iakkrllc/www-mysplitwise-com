import Foundation

/// mysplitwise Pay deep links — port of `src/lib/payment-links.ts`. These only
/// build a URL to hand off to Venmo/PayPal/Cash App; no payment is ever processed
/// in-app (mysplitwise never moves money itself).
public enum PaymentLinks {
    static func stripHandle(_ v: String) -> String {
        var s = v.trimmingCharacters(in: .whitespacesAndNewlines)
        if let first = s.first, first == "@" || first == "$" {
            s.removeFirst()
        }
        if let range = s.range(of: #"^https?://[^/]+/"#, options: .regularExpression) {
            s.removeSubrange(range)
        }
        return s
    }

    static func fixed2(_ amount: Double) -> String {
        String(format: "%.2f", amount)
    }

    public static func venmoPayLink(handle: String, amount: Double, note: String) -> String {
        var components = URLComponents()
        components.queryItems = [
            URLQueryItem(name: "txn", value: "pay"),
            URLQueryItem(name: "amount", value: fixed2(amount)),
            URLQueryItem(name: "note", value: note),
        ]
        let query = components.percentEncodedQuery ?? ""
        return "https://venmo.com/\(stripHandle(handle))?\(query)"
    }

    public static func paypalPayLink(handle: String, amount: Double) -> String {
        "https://paypal.me/\(stripHandle(handle))/\(fixed2(amount))"
    }

    public static func cashAppPayLink(handle: String, amount: Double) -> String {
        "https://cash.app/$\(stripHandle(handle))/\(fixed2(amount))"
    }

    public struct PayOption {
        public let label: String
        public let url: String
    }

    /// Build the list of pay options available for a user, based on which handles they've set.
    public static func payOptions(for user: User, amount: Double, note: String) -> [PayOption] {
        var options: [PayOption] = []
        if let venmo = user.venmo, !venmo.isEmpty {
            options.append(PayOption(label: "Pay with Venmo", url: venmoPayLink(handle: venmo, amount: amount, note: note)))
        }
        if let paypal = user.paypal, !paypal.isEmpty {
            options.append(PayOption(label: "Pay with PayPal", url: paypalPayLink(handle: paypal, amount: amount)))
        }
        if let cashapp = user.cashapp, !cashapp.isEmpty {
            options.append(PayOption(label: "Pay with Cash App", url: cashAppPayLink(handle: cashapp, amount: amount)))
        }
        return options
    }
}
