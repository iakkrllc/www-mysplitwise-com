import Foundation

/// Port of the `User` interface in `src/lib/types.ts`. Field names match the
/// JSON exactly (already camelCase server-side, no `CodingKeys` needed).
public struct User: Codable, Identifiable, Equatable, Hashable {
    public var id: String
    public var name: String
    public var email: String
    public var avatarColor: String
    public var avatarUrl: String?
    public var venmo: String?
    public var paypal: String?
    public var cashapp: String?
    /// True if this person hasn't joined mysplitwise yet — invited by email, not yet connectable.
    public var pending: Bool?
    /// Short reference ID (e.g. MSW-A3F91C2D) for customer support to look up an account by.
    public var supportId: String?
    /// Verified phone number (only ever set after a real OTP confirmation).
    public var phone: String?

    public init(
        id: String, name: String, email: String, avatarColor: String,
        avatarUrl: String? = nil, venmo: String? = nil, paypal: String? = nil,
        cashapp: String? = nil, pending: Bool? = nil, supportId: String? = nil,
        phone: String? = nil
    ) {
        self.id = id
        self.name = name
        self.email = email
        self.avatarColor = avatarColor
        self.avatarUrl = avatarUrl
        self.venmo = venmo
        self.paypal = paypal
        self.cashapp = cashapp
        self.pending = pending
        self.supportId = supportId
        self.phone = phone
    }
}
