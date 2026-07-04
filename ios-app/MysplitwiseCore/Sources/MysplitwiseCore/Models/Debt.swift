import Foundation

/// A single "from owes to" relationship — port of `Debt` in `src/lib/types.ts`.
public struct Debt: Equatable, Hashable {
    public var from: String
    public var to: String
    public var amount: Double

    public init(from: String, to: String, amount: Double) {
        self.from = from
        self.to = to
        self.amount = amount
    }
}
