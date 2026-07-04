package com.mysplitwise.app.logic

/**
 * Deterministic avatar-color assignment — port of `AVATAR_COLORS`/`pickAvatarColor`
 * in `src/lib/store.tsx` (mirrored server-side in `serialize.ts`). Uses wrapping
 * unsigned-32-bit arithmetic to match JS's `(h * 31 + charCode) >>> 0` bit-for-bit,
 * so the same seed always picks the same color on every platform.
 */
object AvatarColor {
    val palette: List<String> = listOf(
        "#7C3AED", "#FF8A5B", "#6C8AE4", "#C566B5", "#E4694A",
        "#5BA0C5", "#7FB069", "#E4A85B", "#B05BC5", "#5BC5C0",
        "#E45B6E", "#9C7B5A",
    )

    fun pick(seed: String): String {
        // Kotlin's UInt wraps on overflow with `*`/`+` the same way JS's `>>> 0`
        // truncates to unsigned 32-bit — no special "wrapping operator" needed,
        // unlike Swift's checked-by-default Int types.
        var h: UInt = 0u
        for (unit in seed) {
            // Iterate UTF-16 code units (Kotlin Char IS a UTF-16 code unit),
            // matching JS's String.charCodeAt semantics exactly, including
            // surrogate-pair halves for characters outside the BMP.
            h = h * 31u + unit.code.toUInt()
        }
        return palette[(h % palette.size.toUInt()).toInt()]
    }
}
