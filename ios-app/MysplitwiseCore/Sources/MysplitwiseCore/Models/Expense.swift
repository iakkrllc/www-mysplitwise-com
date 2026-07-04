import Foundation

/// Per-user breakdown of a single expense. sum(paid)===amount, sum(owed)===amount.
public struct ExpenseShare: Codable, Equatable, Hashable {
    public var userId: String
    public var paid: Double
    public var owed: Double

    public init(userId: String, paid: Double, owed: Double) {
        self.userId = userId
        self.paid = paid
        self.owed = owed
    }
}

public struct Comment: Codable, Identifiable, Equatable, Hashable {
    public var id: String
    public var userId: String
    public var text: String
    public var createdAt: String

    public init(id: String, userId: String, text: String, createdAt: String) {
        self.id = id
        self.userId = userId
        self.text = text
        self.createdAt = createdAt
    }
}

public struct LineItem: Codable, Identifiable, Equatable, Hashable {
    public var id: String
    public var name: String
    public var amount: Double
    public var participantIds: [String]

    public init(id: String, name: String, amount: Double, participantIds: [String]) {
        self.id = id
        self.name = name
        self.amount = amount
        self.participantIds = participantIds
    }
}

public enum PaymentMethod: String, Codable, CaseIterable {
    case cash, card, wire, zelle, venmo, cashapp, paypal, other
}

/// Port of the `Expense` interface in `src/lib/types.ts`.
public struct Expense: Codable, Identifiable, Equatable, Hashable {
    public var id: String
    public var description: String
    public var amount: Double
    public var currency: String
    public var category: String
    /// ISO date string, e.g. "2026-03-14".
    public var date: String
    public var groupId: String?
    public var shares: [ExpenseShare]
    public var createdBy: String
    public var createdAt: String
    public var isSettlement: Bool
    public var notes: String?
    public var receiptUrl: String?
    public var comments: [Comment]?
    public var recurringId: String?
    public var items: [LineItem]?
    public var tax: Double?
    public var tip: Double?
    public var paymentMethod: PaymentMethod?
    /// Settlement dispute audit trail — visibility only, not fraud prevention.
    public var disputed: Bool?
    public var disputeReason: String?
    public var disputedBy: String?
    public var disputedAt: String?

    public init(
        id: String, description: String, amount: Double, currency: String, category: String,
        date: String, groupId: String?, shares: [ExpenseShare], createdBy: String, createdAt: String,
        isSettlement: Bool, notes: String? = nil, receiptUrl: String? = nil, comments: [Comment]? = nil,
        recurringId: String? = nil, items: [LineItem]? = nil, tax: Double? = nil, tip: Double? = nil,
        paymentMethod: PaymentMethod? = nil, disputed: Bool? = nil, disputeReason: String? = nil,
        disputedBy: String? = nil, disputedAt: String? = nil
    ) {
        self.id = id
        self.description = description
        self.amount = amount
        self.currency = currency
        self.category = category
        self.date = date
        self.groupId = groupId
        self.shares = shares
        self.createdBy = createdBy
        self.createdAt = createdAt
        self.isSettlement = isSettlement
        self.notes = notes
        self.receiptUrl = receiptUrl
        self.comments = comments
        self.recurringId = recurringId
        self.items = items
        self.tax = tax
        self.tip = tip
        self.paymentMethod = paymentMethod
        self.disputed = disputed
        self.disputeReason = disputeReason
        self.disputedBy = disputedBy
        self.disputedAt = disputedAt
    }
}
