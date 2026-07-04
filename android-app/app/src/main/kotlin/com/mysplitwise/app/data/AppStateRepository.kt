package com.mysplitwise.app.data

import com.mysplitwise.app.logic.Calculations
import com.mysplitwise.app.logic.Dates
import com.mysplitwise.app.logic.round2
import com.mysplitwise.app.model.Expense
import com.mysplitwise.app.model.ExpenseShare
import com.mysplitwise.app.model.Group
import com.mysplitwise.app.model.GroupType
import com.mysplitwise.app.model.NotificationPrefs
import com.mysplitwise.app.model.PullResponse
import com.mysplitwise.app.model.User
import com.mysplitwise.app.network.SyncApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.Instant
import java.util.UUID

data class AppState(
    val users: List<User> = emptyList(),
    val groups: List<Group> = emptyList(),
    val expenses: List<Expense> = emptyList(),
    val baseCurrency: String = "USD",
    val notificationsReadAt: String? = null,
    val notificationPrefs: NotificationPrefs = NotificationPrefs.DEFAULT,
    val onboarded: Boolean = false,
    val loaded: Boolean = false,
)

/**
 * Server-authoritative app state — port of `store.tsx`. Every mutating action
 * updates local state immediately (optimistic), fires the matching [SyncApi]
 * call, and reconciles on success or rolls back + surfaces an error on
 * failure — exactly like the web app's `addExpense`/`updateExpense` pattern.
 */
class AppStateRepository(private val currentUserId: String, private val cache: LocalCache) {
    private val _state = MutableStateFlow(AppState())
    val state: StateFlow<AppState> = _state.asStateFlow()
    private val _errors = MutableStateFlow<String?>(null)
    val errors: StateFlow<String?> = _errors.asStateFlow()

    suspend fun loadCached() {
        cache.load(currentUserId)?.let { apply(it, persist = false) }
        _state.update { it.copy(loaded = true) }
    }

    val currentUser: User? get() = _state.value.users.firstOrNull { it.id == currentUserId }

    /** All expenses converted to the app's base currency, for balance math. */
    val baseExpenses: List<Expense>
        get() = Calculations.toBaseExpenses(_state.value.expenses, _state.value.baseCurrency)

    fun getUser(id: String): User? = _state.value.users.firstOrNull { it.id == id }
    fun getGroup(id: String): Group? = _state.value.groups.firstOrNull { it.id == id }

    // ---- Pull (source of truth) ----

    suspend fun refresh() {
        val pulled = runCatching { SyncApi.pullState() }.getOrNull() ?: return
        apply(pulled, persist = true)
    }

    private suspend fun apply(pulled: PullResponse, persist: Boolean) {
        _state.update {
            it.copy(
                baseCurrency = pulled.baseCurrency,
                onboarded = pulled.onboarded,
                notificationsReadAt = pulled.notificationsReadAt,
                notificationPrefs = pulled.notificationPrefs,
                users = pulled.users,
                groups = pulled.groups,
                expenses = pulled.expenses,
            )
        }
        if (persist) cache.save(currentUserId, pulled)
    }

    private fun nowIso() = Instant.now().toString()
    private fun tempId() = "temp_" + UUID.randomUUID()

    // ---- Expenses ----

    suspend fun addExpense(newExpense: SyncApi.NewExpense): String {
        val id = tempId()
        val optimistic = Expense(
            id = id, description = newExpense.description, amount = newExpense.amount,
            currency = newExpense.currency, category = newExpense.category, date = newExpense.date,
            groupId = newExpense.groupId, shares = newExpense.shares, createdBy = currentUserId,
            createdAt = nowIso(), isSettlement = newExpense.isSettlement, notes = newExpense.notes,
            items = newExpense.items, tax = newExpense.tax, tip = newExpense.tip,
            paymentMethod = newExpense.paymentMethod,
        )
        _state.update { it.copy(expenses = listOf(optimistic) + it.expenses) }
        try {
            val server = SyncApi.createExpense(newExpense)
            _state.update { s -> s.copy(expenses = s.expenses.map { if (it.id == id) server else it }) }
        } catch (e: Exception) {
            _state.update { it.copy(expenses = it.expenses.filterNot { e -> e.id == id }) }
            _errors.value = "Couldn't save that expense"
        }
        return id
    }

    suspend fun updateExpense(id: String, patch: SyncApi.UpdateExpenseBody) {
        val previous = _state.value.expenses.firstOrNull { it.id == id } ?: return
        try {
            val server = SyncApi.updateExpense(id, patch)
            _state.update { s -> s.copy(expenses = s.expenses.map { if (it.id == id) server else it }) }
        } catch (e: Exception) {
            _state.update { s -> s.copy(expenses = s.expenses.map { if (it.id == id) previous else it }) }
            _errors.value = "Couldn't update that expense"
        }
    }

    suspend fun deleteExpense(id: String) {
        val removed = _state.value.expenses.firstOrNull { it.id == id } ?: return
        _state.update { it.copy(expenses = it.expenses.filterNot { e -> e.id == id }) }
        try {
            SyncApi.deleteExpense(id)
        } catch (e: Exception) {
            _state.update { it.copy(expenses = listOf(removed) + it.expenses) }
            _errors.value = "Couldn't delete that expense"
        }
    }

    // ---- Friends ----

    suspend fun addFriend(name: String, email: String): Pair<String, String> {
        val response = SyncApi.addFriend(name, email)
        _state.update { s ->
            val exists = s.users.any { it.id == response.friend.id }
            s.copy(users = if (exists) s.users.map { if (it.id == response.friend.id) response.friend else it } else s.users + response.friend)
        }
        return response.friend.id to response.status
    }

    suspend fun removeFriend(id: String) {
        val removed = _state.value.users.firstOrNull { it.id == id } ?: return
        _state.update { s ->
            s.copy(
                users = s.users.filterNot { it.id == id },
                groups = s.groups.map { it.copy(memberIds = it.memberIds.filterNot { m -> m == id }) },
            )
        }
        try {
            SyncApi.removeFriend(id)
        } catch (e: Exception) {
            _state.update { it.copy(users = it.users + removed) }
            _errors.value = "Couldn't remove that friend"
        }
    }

    // ---- Groups ----

    suspend fun addGroup(name: String, type: GroupType, memberIds: List<String>): String {
        val id = tempId()
        val optimistic = Group(id = id, name = name, type = type, memberIds = memberIds, simplifyDebts = true, createdAt = nowIso())
        _state.update { it.copy(groups = it.groups + optimistic) }
        try {
            val server = SyncApi.createGroup(name, type, memberIds)
            _state.update { s -> s.copy(groups = s.groups.map { if (it.id == id) server else it }) }
        } catch (e: Exception) {
            _state.update { it.copy(groups = it.groups.filterNot { g -> g.id == id }) }
            _errors.value = "Couldn't create that group"
        }
        return id
    }

    suspend fun updateGroup(id: String, patch: SyncApi.UpdateGroupBody) {
        val previous = _state.value.groups.firstOrNull { it.id == id } ?: return
        try {
            val server = SyncApi.updateGroup(id, patch)
            _state.update { s -> s.copy(groups = s.groups.map { if (it.id == id) server else it }) }
        } catch (e: Exception) {
            _state.update { s -> s.copy(groups = s.groups.map { if (it.id == id) previous else it }) }
            _errors.value = "Couldn't update that group"
        }
    }

    suspend fun deleteGroup(id: String) {
        val removed = _state.value.groups.firstOrNull { it.id == id } ?: return
        _state.update { s ->
            s.copy(
                groups = s.groups.filterNot { it.id == id },
                expenses = s.expenses.map { if (it.groupId == id) it.copy(groupId = null) else it },
            )
        }
        try {
            SyncApi.deleteGroup(id)
        } catch (e: Exception) {
            _state.update { it.copy(groups = it.groups + removed) }
            _errors.value = "Couldn't delete that group"
        }
    }

    // ---- Profile / account ----

    suspend fun updateProfile(patch: SyncApi.ProfilePatch) {
        try {
            val server = SyncApi.updateProfile(currentUserId, patch)
            _state.update { s -> s.copy(users = s.users.map { if (it.id == currentUserId) server else it }) }
        } catch (e: Exception) {
            _errors.value = "Couldn't save your profile changes"
        }
    }

    suspend fun setBaseCurrency(code: String) {
        _state.update { it.copy(baseCurrency = code) }
        runCatching { SyncApi.updateProfile(currentUserId, SyncApi.ProfilePatch(baseCurrency = code)) }
    }

    suspend fun setNotificationsRead() {
        val now = nowIso()
        _state.update { it.copy(notificationsReadAt = now) }
        runCatching { SyncApi.updateProfile(currentUserId, SyncApi.ProfilePatch(notificationsReadAt = now)) }
    }

    // ---- Settlements ----

    suspend fun addSettlements(payments: List<SyncApi.Payment>) {
        if (payments.isEmpty()) return
        val tempIds = payments.map { tempId() }
        val today = Dates.todayISO()
        val now = nowIso()
        val optimistic = payments.zip(tempIds).map { (p, id) ->
            Expense(
                id = id, description = "Payment", amount = round2(p.amount), currency = p.currency,
                category = "payment", date = today, groupId = p.groupId,
                shares = listOf(
                    ExpenseShare(userId = p.fromId, paid = round2(p.amount), owed = 0.0),
                    ExpenseShare(userId = p.toId, paid = 0.0, owed = round2(p.amount)),
                ),
                createdBy = currentUserId, createdAt = now, isSettlement = true,
            )
        }
        _state.update { it.copy(expenses = optimistic + it.expenses) }
        try {
            val server = SyncApi.addSettlements(payments)
            _state.update { s ->
                var expenses = s.expenses
                tempIds.zip(server).forEach { (tempId, serverExpense) ->
                    expenses = expenses.map { if (it.id == tempId) serverExpense else it }
                }
                s.copy(expenses = expenses)
            }
        } catch (e: Exception) {
            _state.update { it.copy(expenses = it.expenses.filterNot { e -> tempIds.contains(e.id) }) }
            _errors.value = "Couldn't record that settlement"
        }
    }

    suspend fun deleteAccount() {
        SyncApi.deleteAccount()
        cache.clear(currentUserId)
    }
}
