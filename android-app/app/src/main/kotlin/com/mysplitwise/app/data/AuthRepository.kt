package com.mysplitwise.app.data

import com.mysplitwise.app.di.NetworkModule
import com.mysplitwise.app.network.SyncApi
import io.github.jan.supabase.auth.OtpType
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.providers.builtin.OTP
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.auth.user.UserInfo
import kotlinx.coroutines.flow.StateFlow
import kotlinx.datetime.Clock
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Wraps supabase-kt's Auth module for every sign-up/sign-in/OTP/session call —
 * port of `src/lib/auth-store.tsx`. After every successful auth event this
 * fires `POST /api/log-activity` and `POST /api/sync/claim-invites`, exactly
 * like the web app (never a database trigger — see `TECHNICAL.md`'s note on
 * why that broke login once before).
 *
 * NOTE: verify the exact supabase-kt call signatures here against the real
 * installed version the first time this compiles — a Gradle compiler error is
 * the fastest way to catch any signature drift.
 */
object AuthRepository {
    private val auth get() = NetworkModule.supabase.auth

    val sessionStatus: StateFlow<SessionStatus> get() = auth.sessionStatus
    val currentUser: UserInfo? get() = auth.currentUserOrNull()
    val isSignedIn: Boolean get() = auth.currentSessionOrNull() != null

    suspend fun signUp(email: String, password: String, name: String) {
        auth.signUpWith(Email) {
            this.email = email
            this.password = password
            data = buildJsonObject { put("name", JsonPrimitive(name)) }
        }
        afterAuthSuccess(eventType = "signup")
    }

    suspend fun signIn(email: String, password: String) {
        try {
            auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            afterAuthSuccess(eventType = "login")
        } catch (e: Exception) {
            runCatching { SyncApi.logActivity("login_failed") }
            throw e
        }
    }

    suspend fun sendPhoneOtp(phone: String, name: String?) {
        auth.signInWith(OTP) {
            this.phone = phone
            name?.let { data = buildJsonObject { put("name", JsonPrimitive(it)) } }
        }
    }

    suspend fun verifyPhoneOtp(phone: String, code: String) {
        auth.verifyPhoneOtp(type = OtpType.Phone.SMS, phone = phone, token = code)
        // Matches the web's heuristic: an account created in the last 60s is "new."
        val createdAt = currentUser?.createdAt
        val isNewAccount = createdAt != null && (Clock.System.now() - createdAt).inWholeSeconds < 60
        afterAuthSuccess(eventType = if (isNewAccount) "signup" else "login")
    }

    suspend fun updatePassword(newPassword: String) {
        auth.updateUser { password = newPassword }
    }

    suspend fun startPhoneChange(phone: String) {
        auth.updateUser { this.phone = phone }
    }

    suspend fun confirmPhoneChange(phone: String, code: String) {
        auth.verifyPhoneOtp(type = OtpType.Phone.PHONE_CHANGE, phone = phone, token = code)
    }

    suspend fun signOut() {
        runCatching { SyncApi.logActivity("logout") }
        auth.signOut()
    }

    private suspend fun afterAuthSuccess(eventType: String) {
        runCatching { SyncApi.logActivity(eventType) }
        runCatching { SyncApi.claimInvites() }
    }
}
