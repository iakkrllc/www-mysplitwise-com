package com.mysplitwise.app.model

import kotlinx.serialization.Serializable

/**
 * Exact shape of `GET /api/sync/pull`'s JSON response (see
 * `src/app/api/sync/pull/route.ts`). Note this does NOT include
 * `templates`/`currentUserId` — those are client-local concepts
 * (`currentUserId` = the authenticated user's own id; expense templates
 * aren't persisted server-side at all, at least not yet).
 */
@Serializable
data class PullResponse(
    val baseCurrency: String,
    val onboarded: Boolean,
    val notificationsReadAt: String? = null,
    val notificationPrefs: NotificationPrefs = NotificationPrefs.DEFAULT,
    val users: List<User>,
    val groups: List<Group>,
    val expenses: List<Expense>,
    val recurring: List<RecurringExpense>,
)
