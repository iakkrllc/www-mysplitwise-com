import Foundation

public enum GroupType: String, Codable, CaseIterable {
    case trip, home, couple, other
}

/// Port of the `Group` interface in `src/lib/types.ts`.
public struct Group: Codable, Identifiable, Equatable, Hashable {
    public var id: String
    public var name: String
    public var type: GroupType
    public var memberIds: [String]
    public var simplifyDebts: Bool
    public var monthlyBudget: Double?
    public var createdAt: String

    public init(
        id: String, name: String, type: GroupType, memberIds: [String],
        simplifyDebts: Bool, monthlyBudget: Double? = nil, createdAt: String
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.memberIds = memberIds
        self.simplifyDebts = simplifyDebts
        self.monthlyBudget = monthlyBudget
        self.createdAt = createdAt
    }
}
