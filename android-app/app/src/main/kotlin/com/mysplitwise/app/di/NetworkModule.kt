package com.mysplitwise.app.di

import com.mysplitwise.app.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth

/**
 * Builds the one shared Supabase client (Auth module only) used for every
 * sign-up/sign-in/OTP/session call. Everything else goes through [com.mysplitwise.app.network.ApiClient]
 * to the existing Next.js backend routes — exactly like the web app never
 * talks to Postgrest directly.
 *
 * NOTE: verify this against the actual installed supabase-kt version the
 * first time this project builds — the shape here matches the package's
 * documented/standard usage as of this writing, but a real Gradle compile
 * error is the fastest way to catch any signature drift.
 */
object NetworkModule {
    val supabase: SupabaseClient by lazy {
        createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
        ) {
            install(Auth)
        }
    }
}
