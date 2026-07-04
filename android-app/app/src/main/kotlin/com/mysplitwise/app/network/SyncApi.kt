package com.mysplitwise.app.network

import com.mysplitwise.app.model.Expense
import com.mysplitwise.app.model.ExpenseShare
import com.mysplitwise.app.model.Group
import com.mysplitwise.app.model.GroupType
import com.mysplitwise.app.model.LineItem
import com.mysplitwise.app.model.NotificationPrefs
import com.mysplitwise.app.model.PaymentMethod
import com.mysplitwise.app.model.PullResponse
import com.mysplitwise.app.model.User
import io.ktor.http.HttpMethod
import kotlinx.serialization.Serializable

/** Typed wrappers around every backend call Phase 1 needs — port of `src/lib/sync-api.ts`. */
object SyncApi {
    // ---- Sync ----

    suspend fun pullState(): PullResponse = ApiClient.request(HttpMethod.Get, Endpoints.SYNC_PULL)

    @Serializable private data class OkResponse(val ok: Boolean)
    @Serializable private data class EmptyBody(val placeholder: Boolean? = null)

    suspend fun claimInvites() {
        ApiClient.request<EmptyBody, OkResponse>(HttpMethod.Post, Endpoints.SYNC_CLAIM_INVITES, EmptyBody())
    }

    @Serializable private data class LogActivityBody(val eventType: String)
    suspend fun logActivity(eventType: String) {
        ApiClient.request<LogActivityBody, OkResponse>(HttpMethod.Post, Endpoints.LOG_ACTIVITY, LogActivityBody(eventType))
    }

    // ---- Friends ----

    @Serializable private data class AddFriendBody(val name: String, val email: String)
    @Serializable data class AddFriendResponse(val status: String, val friend: User)

    suspend fun addFriend(name: String, email: String): AddFriendResponse =
        ApiClient.request(HttpMethod.Post, Endpoints.FRIENDS, AddFriendBody(name, email))

    suspend fun removeFriend(id: String) {
        ApiClient.request<OkResponse>(HttpMethod.Delete, Endpoints.friend(id))
    }

    // ---- Profile ----

    /** All-optional; only non-null fields are serialized (see `encodeDefaults = false` note below). */
    @Serializable
    data class ProfilePatch(
        val name: String? = null,
        val avatarColor: String? = null,
        val venmo: String? = null,
        val paypal: String? = null,
        val cashapp: String? = null,
        val baseCurrency: String? = null,
        val notificationsReadAt: String? = null,
        val onboarded: Boolean? = null,
        val phone: String? = null,
        val notificationPrefs: NotificationPrefs? = null,
    )

    @Serializable private data class UserResponse(val user: User)

    suspend fun updateProfile(id: String, patch: ProfilePatch): User =
        ApiClient.request<ProfilePatch, UserResponse>(HttpMethod.Patch, Endpoints.profile(id), patch).user

    // ---- Groups ----

    @Serializable private data class CreateGroupBody(val name: String, val type: GroupType, val memberIds: List<String>)
    @Serializable private data class GroupResponse(val group: Group)

    suspend fun createGroup(name: String, type: GroupType, memberIds: List<String>): Group =
        ApiClient.request<CreateGroupBody, GroupResponse>(HttpMethod.Post, Endpoints.GROUPS, CreateGroupBody(name, type, memberIds)).group

    @Serializable
    data class UpdateGroupBody(
        val name: String? = null,
        val type: GroupType? = null,
        val simplifyDebts: Boolean? = null,
        val monthlyBudget: Double? = null,
        val memberIds: List<String>? = null,
    )

    suspend fun updateGroup(id: String, patch: UpdateGroupBody): Group =
        ApiClient.request<UpdateGroupBody, GroupResponse>(HttpMethod.Patch, Endpoints.group(id), patch).group

    suspend fun deleteGroup(id: String) {
        ApiClient.request<OkResponse>(HttpMethod.Delete, Endpoints.group(id))
    }

    // ---- Expenses ----

    @Serializable
    data class NewExpense(
        val description: String,
        val amount: Double,
        val currency: String,
        val category: String,
        val date: String,
        val groupId: String? = null,
        val isSettlement: Boolean = false,
        val notes: String? = null,
        val shares: List<ExpenseShare>,
        val items: List<LineItem>? = null,
        val tax: Double? = null,
        val tip: Double? = null,
        val paymentMethod: PaymentMethod? = null,
    )

    @Serializable private data class ExpenseResponse(val expense: Expense)

    suspend fun createExpense(expense: NewExpense): Expense =
        ApiClient.request<NewExpense, ExpenseResponse>(HttpMethod.Post, Endpoints.EXPENSES, expense).expense

    @Serializable
    data class UpdateExpenseBody(
        val description: String? = null,
        val amount: Double? = null,
        val currency: String? = null,
        val category: String? = null,
        val date: String? = null,
        val groupId: String? = null,
        val notes: String? = null,
        val shares: List<ExpenseShare>? = null,
        val items: List<LineItem>? = null,
        val disputed: Boolean? = null,
        val disputeReason: String? = null,
    )

    suspend fun updateExpense(id: String, patch: UpdateExpenseBody): Expense =
        ApiClient.request<UpdateExpenseBody, ExpenseResponse>(HttpMethod.Patch, Endpoints.expense(id), patch).expense

    suspend fun deleteExpense(id: String) {
        ApiClient.request<OkResponse>(HttpMethod.Delete, Endpoints.expense(id))
    }

    // ---- Settlements ----

    @Serializable
    data class Payment(val fromId: String, val toId: String, val amount: Double, val currency: String, val groupId: String? = null)
    @Serializable private data class AddSettlementsBody(val payments: List<Payment>)
    @Serializable private data class AddSettlementsResponse(val expenses: List<Expense>)

    suspend fun addSettlements(payments: List<Payment>): List<Expense> =
        ApiClient.request<AddSettlementsBody, AddSettlementsResponse>(HttpMethod.Post, Endpoints.SETTLEMENTS, AddSettlementsBody(payments)).expenses

    // ---- Account ----

    suspend fun deleteAccount() {
        ApiClient.request<EmptyBody, OkResponse>(HttpMethod.Post, Endpoints.ACCOUNT_DELETE, EmptyBody())
    }
}
