package com.mysplitwise.app.model

import kotlinx.serialization.Serializable

/** Port of the `User` interface in `src/lib/types.ts`. */
@Serializable
data class User(
    val id: String,
    val name: String,
    val email: String,
    val avatarColor: String,
    val avatarUrl: String? = null,
    val venmo: String? = null,
    val paypal: String? = null,
    val cashapp: String? = null,
    /** True if this person hasn't joined mysplitwise yet — invited by email, not yet connectable. */
    val pending: Boolean? = null,
    /** Short reference ID (e.g. MSW-A3F91C2D) for customer support to look up an account by. */
    val supportId: String? = null,
    /** Verified phone number (only ever set after a real OTP confirmation). */
    val phone: String? = null,
)
