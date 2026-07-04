import Foundation
import MysplitwiseCore

/// Typed wrappers around every `/api/*` call Phase 1 needs — port of
/// `src/lib/sync-api.ts`.
enum SyncAPI {
    // MARK: - Sync

    static func pullState() async throws -> PullResponse {
        try await APIClient.request("GET", Endpoints.syncPull)
    }

    struct OkResponse: Decodable { let ok: Bool }

    static func claimInvites() async throws {
        let _: OkResponse = try await APIClient.request("POST", Endpoints.syncClaimInvites, body: EmptyBody())
    }

    struct LogActivityBody: Encodable { let eventType: String }
    static func logActivity(eventType: String) async throws {
        let _: OkResponse = try await APIClient.request(
            "POST", Endpoints.logActivity, body: LogActivityBody(eventType: eventType)
        )
    }

    // MARK: - Friends

    struct AddFriendBody: Encodable { let name: String; let email: String }
    struct AddFriendResponse: Decodable { let status: String; let friend: User }

    static func addFriend(name: String, email: String) async throws -> AddFriendResponse {
        try await APIClient.request("POST", Endpoints.friends, body: AddFriendBody(name: name, email: email))
    }

    static func removeFriend(id: String) async throws {
        let _: OkResponse = try await APIClient.request("DELETE", Endpoints.friend(id))
    }

    // MARK: - Profile

    /// All-optional so `JSONEncoder` only serializes the fields you actually set
    /// (Swift's Codable synthesis uses `encodeIfPresent` for Optional properties).
    /// No `avatarUrl` field yet — avatar photo upload/clearing is Phase 2+.
    struct ProfilePatch: Encodable {
        var name: String?
        var avatarColor: String?
        var venmo: String?
        var paypal: String?
        var cashapp: String?
        var baseCurrency: String?
        var notificationsReadAt: String?
        var onboarded: Bool?
        var phone: String?
        var notificationPrefs: NotificationPrefs?
    }

    struct UserResponse: Decodable { let user: User }

    static func updateProfile(id: String, patch: ProfilePatch) async throws -> User {
        let response: UserResponse = try await APIClient.request("PATCH", Endpoints.profile(id), body: patch)
        return response.user
    }

    // MARK: - Groups

    struct CreateGroupBody: Encodable { let name: String; let type: GroupType; let memberIds: [String] }
    struct GroupResponse: Decodable { let group: Group }

    static func createGroup(name: String, type: GroupType, memberIds: [String]) async throws -> Group {
        let response: GroupResponse = try await APIClient.request(
            "POST", Endpoints.groups, body: CreateGroupBody(name: name, type: type, memberIds: memberIds)
        )
        return response.group
    }

    struct UpdateGroupBody: Encodable {
        var name: String?
        var type: GroupType?
        var simplifyDebts: Bool?
        var monthlyBudget: Double?
        var memberIds: [String]?
    }

    static func updateGroup(id: String, patch: UpdateGroupBody) async throws -> Group {
        let response: GroupResponse = try await APIClient.request("PATCH", Endpoints.group(id), body: patch)
        return response.group
    }

    static func deleteGroup(id: String) async throws {
        let _: OkResponse = try await APIClient.request("DELETE", Endpoints.group(id))
    }

    // MARK: - Expenses

    struct NewExpense: Encodable {
        var description: String
        var amount: Double
        var currency: String
        var category: String
        var date: String
        var groupId: String?
        var isSettlement: Bool = false
        var notes: String?
        var shares: [ExpenseShare]
        var items: [LineItem]?
        var tax: Double?
        var tip: Double?
        var paymentMethod: PaymentMethod?
    }

    struct ExpenseResponse: Decodable { let expense: Expense }

    static func createExpense(_ expense: NewExpense) async throws -> Expense {
        let response: ExpenseResponse = try await APIClient.request("POST", Endpoints.expenses, body: expense)
        return response.expense
    }

    struct UpdateExpenseBody: Encodable {
        var description: String?
        var amount: Double?
        var currency: String?
        var category: String?
        var date: String?
        var groupId: String?
        var notes: String?
        var shares: [ExpenseShare]?
        var items: [LineItem]?
        var disputed: Bool?
        var disputeReason: String?
    }

    static func updateExpense(id: String, patch: UpdateExpenseBody) async throws -> Expense {
        let response: ExpenseResponse = try await APIClient.request("PATCH", Endpoints.expense(id), body: patch)
        return response.expense
    }

    static func deleteExpense(id: String) async throws {
        let _: OkResponse = try await APIClient.request("DELETE", Endpoints.expense(id))
    }

    // MARK: - Settlements

    struct Payment: Encodable {
        let fromId: String
        let toId: String
        let amount: Double
        let currency: String
        let groupId: String?
    }
    struct AddSettlementsBody: Encodable { let payments: [Payment] }
    struct AddSettlementsResponse: Decodable { let expenses: [Expense] }

    static func addSettlements(_ payments: [Payment]) async throws -> [Expense] {
        let response: AddSettlementsResponse = try await APIClient.request(
            "POST", Endpoints.settlements, body: AddSettlementsBody(payments: payments)
        )
        return response.expenses
    }

    // MARK: - Account

    static func deleteAccount() async throws {
        let _: OkResponse = try await APIClient.request("POST", Endpoints.accountDelete, body: EmptyBody())
    }

    struct EmptyBody: Encodable {}
}
