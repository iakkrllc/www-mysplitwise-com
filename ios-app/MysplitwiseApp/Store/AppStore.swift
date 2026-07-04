import Foundation
import MysplitwiseCore

/// Server-authoritative app state — port of `store.tsx`. Every mutating action
/// updates local state immediately (optimistic), fires the matching `SyncAPI`
/// call, and reconciles on success or rolls back + surfaces an error on
/// failure — exactly like the web app's `addExpense`/`updateExpense` pattern.
@MainActor
final class AppStore: ObservableObject {
    @Published private(set) var users: [User] = []
    @Published private(set) var groups: [Group] = []
    @Published private(set) var expenses: [Expense] = []
    @Published private(set) var recurring: [RecurringExpense] = []
    @Published private(set) var baseCurrency: String = "USD"
    @Published private(set) var notificationsReadAt: String?
    @Published private(set) var notificationPrefs: NotificationPrefs = .default
    @Published private(set) var onboarded: Bool = false
    @Published private(set) var loaded = false
    @Published var lastErrorMessage: String?

    let currentUserId: String

    init(currentUserId: String) {
        self.currentUserId = currentUserId
        if let cached = LocalCache.load(userId: currentUserId) {
            apply(cached, persist: false)
        }
        loaded = true // paint cached/blank UI immediately; refresh() pulls the real state
    }

    var currentUser: User? { users.first { $0.id == currentUserId } }

    /// All expenses converted to the app's base currency, for balance math.
    var baseExpenses: [Expense] { Calculations.toBaseExpenses(expenses, base: baseCurrency) }

    func getUser(_ id: String) -> User? { users.first { $0.id == id } }
    func getGroup(_ id: String) -> Group? { groups.first { $0.id == id } }

    // MARK: - Pull (source of truth)

    func refresh() async {
        guard let pulled = try? await SyncAPI.pullState() else {
            return // keep showing current state; the next poll/foreground may succeed
        }
        apply(pulled, persist: true)
    }

    private func apply(_ pulled: PullResponse, persist: Bool) {
        baseCurrency = pulled.baseCurrency
        onboarded = pulled.onboarded
        notificationsReadAt = pulled.notificationsReadAt
        notificationPrefs = pulled.notificationPrefs ?? .default
        users = pulled.users
        groups = pulled.groups
        expenses = pulled.expenses
        recurring = pulled.recurring
        if persist { LocalCache.save(userId: currentUserId, state: pulled) }
    }

    private func nowISO8601() -> String { ISO8601DateFormatter().string(from: Date()) }

    // MARK: - Expenses

    @discardableResult
    func addExpense(_ newExpense: SyncAPI.NewExpense) async -> String {
        let tempId = "temp_" + UUID().uuidString
        let optimistic = Expense(
            id: tempId, description: newExpense.description, amount: newExpense.amount,
            currency: newExpense.currency, category: newExpense.category, date: newExpense.date,
            groupId: newExpense.groupId, shares: newExpense.shares, createdBy: currentUserId,
            createdAt: nowISO8601(), isSettlement: newExpense.isSettlement, notes: newExpense.notes,
            items: newExpense.items, tax: newExpense.tax, tip: newExpense.tip,
            paymentMethod: newExpense.paymentMethod
        )
        expenses.insert(optimistic, at: 0)
        do {
            let server = try await SyncAPI.createExpense(newExpense)
            if let idx = expenses.firstIndex(where: { $0.id == tempId }) { expenses[idx] = server }
        } catch {
            expenses.removeAll { $0.id == tempId }
            lastErrorMessage = "Couldn't save that expense"
        }
        return tempId
    }

    func updateExpense(id: String, patch: SyncAPI.UpdateExpenseBody) async {
        guard let idx = expenses.firstIndex(where: { $0.id == id }) else { return }
        let previous = expenses[idx]
        do {
            let server = try await SyncAPI.updateExpense(id: id, patch: patch)
            if let i = expenses.firstIndex(where: { $0.id == id }) { expenses[i] = server }
        } catch {
            if let i = expenses.firstIndex(where: { $0.id == id }) { expenses[i] = previous }
            lastErrorMessage = "Couldn't update that expense"
        }
    }

    func deleteExpense(id: String) async {
        guard let removed = expenses.first(where: { $0.id == id }) else { return }
        expenses.removeAll { $0.id == id }
        do {
            try await SyncAPI.deleteExpense(id: id)
        } catch {
            expenses.insert(removed, at: 0)
            lastErrorMessage = "Couldn't delete that expense"
        }
    }

    // MARK: - Friends

    func addFriend(name: String, email: String) async throws -> (id: String, status: String) {
        let response = try await SyncAPI.addFriend(name: name, email: email)
        if let idx = users.firstIndex(where: { $0.id == response.friend.id }) {
            users[idx] = response.friend
        } else {
            users.append(response.friend)
        }
        return (response.friend.id, response.status)
    }

    func removeFriend(id: String) async {
        guard let removed = users.first(where: { $0.id == id }) else { return }
        users.removeAll { $0.id == id }
        groups = groups.map { g in
            var group = g
            group.memberIds.removeAll { $0 == id }
            return group
        }
        do {
            try await SyncAPI.removeFriend(id: id)
        } catch {
            users.append(removed)
            lastErrorMessage = "Couldn't remove that friend"
        }
    }

    // MARK: - Groups

    @discardableResult
    func addGroup(name: String, type: GroupType, memberIds: [String]) async -> String {
        let tempId = "temp_" + UUID().uuidString
        let optimistic = Group(
            id: tempId, name: name, type: type, memberIds: memberIds,
            simplifyDebts: true, createdAt: nowISO8601()
        )
        groups.append(optimistic)
        do {
            let server = try await SyncAPI.createGroup(name: name, type: type, memberIds: memberIds)
            if let idx = groups.firstIndex(where: { $0.id == tempId }) { groups[idx] = server }
        } catch {
            groups.removeAll { $0.id == tempId }
            lastErrorMessage = "Couldn't create that group"
        }
        return tempId
    }

    func updateGroup(id: String, patch: SyncAPI.UpdateGroupBody) async {
        guard let idx = groups.firstIndex(where: { $0.id == id }) else { return }
        let previous = groups[idx]
        do {
            let server = try await SyncAPI.updateGroup(id: id, patch: patch)
            if let i = groups.firstIndex(where: { $0.id == id }) { groups[i] = server }
        } catch {
            if let i = groups.firstIndex(where: { $0.id == id }) { groups[i] = previous }
            lastErrorMessage = "Couldn't update that group"
        }
    }

    func deleteGroup(id: String) async {
        guard let removed = groups.first(where: { $0.id == id }) else { return }
        groups.removeAll { $0.id == id }
        expenses = expenses.map { e in
            var expense = e
            if expense.groupId == id { expense.groupId = nil }
            return expense
        }
        do {
            try await SyncAPI.deleteGroup(id: id)
        } catch {
            groups.append(removed)
            lastErrorMessage = "Couldn't delete that group"
        }
    }

    // MARK: - Profile / account

    func updateProfile(_ patch: SyncAPI.ProfilePatch) async {
        do {
            let server = try await SyncAPI.updateProfile(id: currentUserId, patch: patch)
            if let idx = users.firstIndex(where: { $0.id == currentUserId }) { users[idx] = server }
        } catch {
            lastErrorMessage = "Couldn't save your profile changes"
        }
    }

    func setBaseCurrency(_ code: String) async {
        baseCurrency = code
        try? await SyncAPI.updateProfile(id: currentUserId, patch: .init(baseCurrency: code))
    }

    func setNotificationsRead() async {
        let now = nowISO8601()
        notificationsReadAt = now
        try? await SyncAPI.updateProfile(id: currentUserId, patch: .init(notificationsReadAt: now))
    }

    // MARK: - Settlements

    func addSettlements(_ payments: [SyncAPI.Payment]) async {
        guard !payments.isEmpty else { return }
        let tempIds = payments.map { _ in "temp_" + UUID().uuidString }
        let today = Dates.todayISO()
        let now = nowISO8601()
        let optimistic: [Expense] = zip(tempIds, payments).map { tempId, p in
            Expense(
                id: tempId, description: "Payment", amount: round2(p.amount), currency: p.currency,
                category: "payment", date: today, groupId: p.groupId,
                shares: [
                    ExpenseShare(userId: p.fromId, paid: round2(p.amount), owed: 0),
                    ExpenseShare(userId: p.toId, paid: 0, owed: round2(p.amount)),
                ],
                createdBy: currentUserId, createdAt: now, isSettlement: true
            )
        }
        expenses.insert(contentsOf: optimistic, at: 0)
        do {
            let server = try await SyncAPI.addSettlements(payments)
            for (tempId, serverExpense) in zip(tempIds, server) {
                if let idx = expenses.firstIndex(where: { $0.id == tempId }) { expenses[idx] = serverExpense }
            }
        } catch {
            expenses.removeAll { tempIds.contains($0.id) }
            lastErrorMessage = "Couldn't record that settlement"
        }
    }

    func deleteAccount() async throws {
        try await SyncAPI.deleteAccount()
        LocalCache.clear(userId: currentUserId)
    }
}
