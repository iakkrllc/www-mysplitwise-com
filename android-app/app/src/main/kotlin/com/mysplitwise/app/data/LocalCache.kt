package com.mysplitwise.app.data

import android.content.Context
import com.mysplitwise.app.model.PullResponse
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import java.io.File

/**
 * Server-is-source-of-truth resilience cache — port of `store.tsx`'s
 * localStorage philosophy. One JSON file per signed-in user (namespaced by
 * Supabase user id, mirroring `mysplitwise.state.v1.<userId>`), used only to
 * paint the UI instantly on next launch and survive a brief network outage —
 * never treated as authoritative. Deliberately a flat file, not Room: dataset
 * size and lack of complex local queries don't justify the schema-migration
 * overhead at Phase 1's scale.
 */
class LocalCache(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true }
    private val mutex = Mutex()

    private fun file(userId: String): File = File(context.filesDir, "mysplitwise.state.v1.$userId.json")

    suspend fun load(userId: String): PullResponse? = mutex.withLock {
        val f = file(userId)
        if (!f.exists()) return@withLock null
        runCatching { json.decodeFromString<PullResponse>(f.readText()) }.getOrNull()
    }

    suspend fun save(userId: String, state: PullResponse) = mutex.withLock {
        runCatching { file(userId).writeText(json.encodeToString(state)) }
        // Best-effort cache — a write failure just means next launch falls
        // back to a blank state until the next successful pull.
    }

    suspend fun clear(userId: String) = mutex.withLock {
        file(userId).delete()
    }
}
