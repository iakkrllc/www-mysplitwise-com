package com.mysplitwise.app

import com.mysplitwise.app.logic.Split
import org.junit.Assert.assertEquals
import org.junit.Test

class SplitTest {
    @Test
    fun equalSplitExact() {
        assertEquals(listOf(25.0, 25.0, 25.0, 25.0), Split.equal(100.0, 4))
    }

    @Test
    fun equalSplitWithRemainderGoesToFirstParticipants() {
        // 10.00 / 3 = 3.33333..., cents = 1000, base = 333, rem = 1 -> first participant gets the extra cent.
        val result = Split.equal(10.0, 3)
        assertEquals(listOf(3.34, 3.33, 3.33), result)
        assertEquals(10.0, result.sum(), 0.0001)
    }

    @Test
    fun equalSplitZeroParticipants() {
        assertEquals(emptyList<Double>(), Split.equal(50.0, 0))
    }

    @Test
    fun byPercentSumsExactlyToAmount() {
        val result = Split.byPercent(100.0, listOf(33.33, 33.33, 33.34))
        assertEquals(100.0, result.sum(), 0.0001)
    }

    @Test
    fun byPercentRoundRobinDriftCorrection() {
        val third = 1.0 / 3.0 * 100
        val result = Split.byPercent(10.0, listOf(third, third, third))
        assertEquals(10.0, result.sum(), 0.0001)
        // Round-robin starts at index 0, so any extra/missing cent lands on the first entries.
        assertEquals(3.34, result[0], 0.0001)
    }

    @Test
    fun bySharesProportional() {
        // shares 1:1:2 of 40 -> 10/10/20
        assertEquals(listOf(10.0, 10.0, 20.0), Split.byShares(40.0, listOf(1.0, 1.0, 2.0)))
    }

    @Test
    fun bySharesZeroTotalReturnsZeros() {
        assertEquals(listOf(0.0, 0.0), Split.byShares(40.0, listOf(0.0, 0.0)))
    }
}
