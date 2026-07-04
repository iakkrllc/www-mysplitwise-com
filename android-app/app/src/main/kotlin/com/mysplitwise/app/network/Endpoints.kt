package com.mysplitwise.app.network

/**
 * Path constants for the backend routes Phase 1 uses. Mirrors the routes
 * referenced by `src/lib/sync-api.ts` — see `TECHNICAL.md` in the web repo
 * for the full API contract.
 */
object Endpoints {
    const val SYNC_PULL = "api/sync/pull"
    const val SYNC_CLAIM_INVITES = "api/sync/claim-invites"
    const val LOG_ACTIVITY = "api/log-activity"
    const val EXPENSES = "api/expenses"
    fun expense(id: String) = "api/expenses/$id"
    const val GROUPS = "api/groups"
    fun group(id: String) = "api/groups/$id"
    const val FRIENDS = "api/friends"
    fun friend(id: String) = "api/friends/$id"
    fun profile(id: String) = "api/profiles/$id"
    const val SETTLEMENTS = "api/settlements"
    const val ACCOUNT_DELETE = "api/account/delete"
}
