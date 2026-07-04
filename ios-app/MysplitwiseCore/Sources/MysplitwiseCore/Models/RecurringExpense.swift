import Foundation

/// Port of the `RecurringExpense` interface in `src/lib/types.ts`. Raw
/// pass-through model for Phase 1 — no recurring-bill UI yet, but the pull
/// response must round-trip this cleanly.
public struct RecurringExpense: Codable, Identifiable, Equatable, Hashable {
    public var id: String
    public var description: String
    public var amount: Double
    public var currency: String
    public var category: String
    public var groupId: String?
    public var shares: [ExpenseShare]
    public var payerId: String
    public var createdBy: String
    public var frequency: Frequency
    public var startDate: String
    public var nextDue: String
    public var active: Bool
    public var createdAt: String

    public init(
        id: String, description: String, amount: Double, currency: String, category: String,
        groupId: String?, shares: [ExpenseShare], payerId: String, createdBy: String,
        frequency: Frequency, startDate: String, nextDue: String, active: Bool, createdAt: String
    ) {
        self.id = id
        self.description = description
        self.amount = amount
        self.currency = currency
        self.category = category
        self.groupId = groupId
        self.shares = shares
        self.payerId = payerId
        self.createdBy = createdBy
        self.frequency = frequency
        self.startDate = startDate
        self.nextDue = nextDue
        self.active = active
        self.createdAt = createdAt
    }
}
