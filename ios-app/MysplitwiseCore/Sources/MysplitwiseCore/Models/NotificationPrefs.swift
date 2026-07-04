import Foundation

/// Port of `NotificationPrefs` in `src/lib/types.ts`. Controls the in-app
/// notification bell only — there is no email/push system. A private
/// preference, never attached to a friend's `User` object, only the
/// signed-in user's own state.
///
/// The server can return a partial or empty `{}` object (a brand-new profile
/// has no `notification_prefs` row data yet) — decoding uses `decodeIfPresent`
/// per field, defaulting missing ones to `true`, mirroring the web's
/// `{...DEFAULT_NOTIFICATION_PREFS, ...pulled.notificationPrefs}` merge so a
/// future 8th notification type defaults on for existing users with no
/// required migration.
public struct NotificationPrefs: Codable, Equatable {
    public var recurringDue: Bool
    public var comment: Bool
    public var settlementReceived: Bool
    public var settlementDisputed: Bool
    public var aiNudge: Bool
    public var friendOwesYou: Bool
    public var youOweFriend: Bool

    public init(
        recurringDue: Bool = true, comment: Bool = true, settlementReceived: Bool = true,
        settlementDisputed: Bool = true, aiNudge: Bool = true, friendOwesYou: Bool = true,
        youOweFriend: Bool = true
    ) {
        self.recurringDue = recurringDue
        self.comment = comment
        self.settlementReceived = settlementReceived
        self.settlementDisputed = settlementDisputed
        self.aiNudge = aiNudge
        self.friendOwesYou = friendOwesYou
        self.youOweFriend = youOweFriend
    }

    public static let `default` = NotificationPrefs()

    private enum CodingKeys: String, CodingKey {
        case recurringDue, comment, settlementReceived, settlementDisputed, aiNudge, friendOwesYou, youOweFriend
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        recurringDue = try c.decodeIfPresent(Bool.self, forKey: .recurringDue) ?? true
        comment = try c.decodeIfPresent(Bool.self, forKey: .comment) ?? true
        settlementReceived = try c.decodeIfPresent(Bool.self, forKey: .settlementReceived) ?? true
        settlementDisputed = try c.decodeIfPresent(Bool.self, forKey: .settlementDisputed) ?? true
        aiNudge = try c.decodeIfPresent(Bool.self, forKey: .aiNudge) ?? true
        friendOwesYou = try c.decodeIfPresent(Bool.self, forKey: .friendOwesYou) ?? true
        youOweFriend = try c.decodeIfPresent(Bool.self, forKey: .youOweFriend) ?? true
    }
}
