package com.mysplitwise.app.model

/** A single "from owes to" relationship — port of `Debt` in `src/lib/types.ts`. */
data class Debt(
    val from: String,
    val to: String,
    val amount: Double,
)
