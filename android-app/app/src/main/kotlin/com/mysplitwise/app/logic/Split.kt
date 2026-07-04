package com.mysplitwise.app.logic

import kotlin.math.roundToLong

/**
 * Cent-accurate splitting primitives — port of `src/lib/split.ts`. All money
 * math happens in integer cents to avoid floating-point drift, matching the
 * web app exactly so a native-computed split always matches what the server
 * stores.
 */
object Split {
    /**
     * Distribute [amount] across [n] participants as evenly as possible,
     * cent-accurate. The remainder (if amount*100 doesn't divide evenly by n)
     * goes one-each to the first `rem` participants in order — deterministic,
     * not random.
     */
    fun equal(amount: Double, n: Int): List<Double> {
        if (n <= 0) return emptyList()
        val cents = (amount * 100).roundToLong()
        val base = cents / n
        val rem = (cents - base * n).toInt()
        return (0 until n).map { i -> (base + if (i < rem) 1 else 0) / 100.0 }
    }

    /**
     * Distribute [amount] by percentages (which should sum to 100),
     * cent-accurate. Each percentage's cent share is rounded independently,
     * then any rounding drift is corrected by walking the array round-robin
     * from index 0, adding or subtracting one cent per step until the drift
     * reaches zero.
     */
    fun byPercent(amount: Double, percents: List<Double>): List<Double> {
        val cents = (amount * 100).roundToLong()
        val rounded = percents.map { p -> (cents * p / 100).roundToLong() }.toMutableList()
        var diff = cents - rounded.sum()
        var i = 0
        while (diff != 0L && rounded.isNotEmpty()) {
            val idx = i % rounded.size
            rounded[idx] += if (diff > 0) 1 else -1
            diff += if (diff > 0) -1 else 1
            i++
        }
        return rounded.map { it / 100.0 }
    }

    /** Distribute [amount] by arbitrary integer/float shares (e.g. 1/1/2). */
    fun byShares(amount: Double, shares: List<Double>): List<Double> {
        val total = shares.sum()
        if (total <= 0) return shares.map { 0.0 }
        return byPercent(amount, shares.map { it / total * 100 })
    }
}
