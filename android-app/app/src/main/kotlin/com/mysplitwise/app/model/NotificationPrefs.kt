package com.mysplitwise.app.model

import kotlinx.serialization.Serializable

/**
 * Port of `NotificationPrefs` in `src/lib/types.ts`. Controls the in-app
 * notification bell only — there is no email/push system. A private
 * preference, never attached to a friend's `User` object, only the signed-in
 * user's own state.
 *
 * The server can return a partial or empty `{}` object (a brand-new profile
 * has no `notification_prefs` row data yet) — kotlinx.serialization already
 * falls back to each parameter's default value for any missing JSON key, so
 * no custom deserializer is needed here (unlike the iOS Codable port, which
 * requires an explicit `init(from:)` for the same reason).
 */
@Serializable
data class NotificationPrefs(
    val recurringDue: Boolean = true,
    val comment: Boolean = true,
    val settlementReceived: Boolean = true,
    val settlementDisputed: Boolean = true,
    val aiNudge: Boolean = true,
    val friendOwesYou: Boolean = true,
    val youOweFriend: Boolean = true,
) {
    companion object {
        val DEFAULT = NotificationPrefs()
    }
}
