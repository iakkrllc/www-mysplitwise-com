import Foundation

/// Exact shape of `GET /api/sync/pull`'s JSON response (see `src/app/api/sync/pull/route.ts`).
/// Note this does NOT include `templates`/`currentUserId` — those are client-local
/// concepts (`currentUserId` = the authenticated user's own id; expense templates
/// aren't persisted server-side at all, at least not yet).
public struct PullResponse: Codable, Equatable {
    public var baseCurrency: String
    public var onboarded: Bool
    public var notificationsReadAt: String?
    public var notificationPrefs: NotificationPrefs?
    public var users: [User]
    public var groups: [Group]
    public var expenses: [Expense]
    public var recurring: [RecurringExpense]

    public init(
        baseCurrency: String, onboarded: Bool, notificationsReadAt: String? = nil,
        notificationPrefs: NotificationPrefs? = nil, users: [User], groups: [Group],
        expenses: [Expense], recurring: [RecurringExpense]
    ) {
        self.baseCurrency = baseCurrency
        self.onboarded = onboarded
        self.notificationsReadAt = notificationsReadAt
        self.notificationPrefs = notificationPrefs
        self.users = users
        self.groups = groups
        self.expenses = expenses
        self.recurring = recurring
    }
}
