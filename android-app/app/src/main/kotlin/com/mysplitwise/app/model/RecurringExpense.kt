package com.mysplitwise.app.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Frequency {
    @SerialName("weekly") WEEKLY,
    @SerialName("monthly") MONTHLY,
    @SerialName("yearly") YEARLY,
}

/**
 * Port of the `RecurringExpense` interface in `src/lib/types.ts`. Raw
 * pass-through model for Phase 1 — no recurring-bill UI yet, but the pull
 * response must round-trip this cleanly.
 */
@Serializable
data class RecurringExpense(
    val id: String,
    val description: String,
    val amount: Double,
    val currency: String,
    val category: String,
    val groupId: String? = null,
    val shares: List<ExpenseShare>,
    val payerId: String,
    val createdBy: String,
    val frequency: Frequency,
    val startDate: String,
    val nextDue: String,
    val active: Boolean,
    val createdAt: String,
)
