package com.mysplitwise.app

import com.mysplitwise.app.logic.AvatarColor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AvatarColorTest {
    @Test
    fun deterministic() {
        val a = AvatarColor.pick("alice@example.com")
        val b = AvatarColor.pick("alice@example.com")
        assertEquals(a, b)
    }

    @Test
    fun differentSeedsCanProduceDifferentColors() {
        val colors = setOf("alice@example.com", "bob@example.com", "carol@example.com", "dave@example.com")
            .map { AvatarColor.pick(it) }.toSet()
        assertTrue(colors.size > 1)
    }

    @Test
    fun resultIsAlwaysInPalette() {
        listOf("", "a", "z", "🙂", "a-very-long-email-address@example.com").forEach { seed ->
            assertTrue(AvatarColor.palette.contains(AvatarColor.pick(seed)))
        }
    }

    @Test
    fun emptySeedDoesNotCrash() {
        assertEquals(AvatarColor.palette[0], AvatarColor.pick(""))
    }
}
