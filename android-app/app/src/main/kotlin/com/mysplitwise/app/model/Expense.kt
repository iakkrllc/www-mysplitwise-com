package com.mysplitwise.app.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Per-user breakdown of a single expense. sum(paid)===amount, sum(owed)===amount. */
@Serializable
data class ExpenseShare(
    val userId: String,
    val paid: Double,
    val owed: Double,
)

@Serializable
data class Comment(
    val id: String,
    val userId: String,
    val text: String,
    val createdAt: String,
)

@Serializable
data class LineItem(
    val id: String,
    val name: String,
    val amount: Double,
    val participantIds: List<String>,
)

@Serializable
enum class PaymentMethod {
    @SerialName("cash") CASH,
    @SerialName("card") CARD,
    @SerialName("wire") WIRE,
    @SerialName("zelle") ZELLE,
    @SerialName("venmo") VENMO,
    @SerialName("cashapp") CASHAPP,
    @SerialName("paypal") PAYPAL,
    @SerialName("other") OTHER,
}

/** Port of the `Expense` interface in `src/lib/types.ts`. */
@Serializable
data class Expense(
    val id: String,
    val description: String,
    val amount: Double,
    val currency: String,
    val category: String,
    /** ISO date string, e.g. "2026-03-14". */
    val date: String,
    val groupId: String? = null,
    val shares: List<ExpenseShare>,
    val createdBy: String,
    val createdAt: String,
    val isSettlement: Boolean,
    val notes: String? = null,
    val receiptUrl: String? = null,
    val comments: List<Comment>? = null,
    val recurringId: String? = null,
    val items: List<LineItem>? = null,
    val tax: Double? = null,
    val tip: Double? = null,
    val paymentMethod: PaymentMethod? = null,
    /** Settlement dispute audit trail — visibility only, not fraud prevention. */
    val disputed: Boolean? = null,
    val disputeReason: String? = null,
    val disputedBy: String? = null,
    val disputedAt: String? = null,
)
