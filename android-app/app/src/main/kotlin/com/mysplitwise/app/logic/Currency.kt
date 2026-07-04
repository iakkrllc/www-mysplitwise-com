package com.mysplitwise.app.logic

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

/**
 * Static currency table + conversion — port of `src/lib/currency.ts`. Rates are
 * fixed at build time (no live-rate API call), matching the web app.
 */
data class CurrencyInfo(
    val code: String,
    val symbol: String,
    val name: String,
    /** Units of this currency per 1 USD. */
    val rate: Double,
)

object Currency {
    val all: List<CurrencyInfo> = listOf(
        CurrencyInfo("USD", "$", "US Dollar", 1.0),
        CurrencyInfo("EUR", "€", "Euro", 0.92),
        CurrencyInfo("GBP", "£", "British Pound", 0.79),
        CurrencyInfo("INR", "₹", "Indian Rupee", 83.2),
        CurrencyInfo("JPY", "¥", "Japanese Yen", 156.0),
        CurrencyInfo("CAD", "C$", "Canadian Dollar", 1.36),
        CurrencyInfo("AUD", "A$", "Australian Dollar", 1.51),
        CurrencyInfo("MXN", "Mex$", "Mexican Peso", 17.1),
        CurrencyInfo("BRL", "R$", "Brazilian Real", 5.05),
        CurrencyInfo("SGD", "S$", "Singapore Dollar", 1.35),
        CurrencyInfo("CHF", "CHF", "Swiss Franc", 0.9),
        CurrencyInfo("CNY", "¥", "Chinese Yuan", 7.24),
        CurrencyInfo("AED", "د.إ", "UAE Dirham", 3.67),
        CurrencyInfo("ZAR", "R", "South African Rand", 18.6),
    )

    private val byCode: Map<String, CurrencyInfo> = all.associateBy { it.code }
    private val zeroDecimal = setOf("JPY", "CNY")

    fun get(code: String): CurrencyInfo = byCode[code] ?: byCode.getValue("USD")

    /** Converts [amount] from [from] to [to] via USD as an intermediate. No rounding applied. */
    fun convert(amount: Double, from: String, to: String): Double {
        if (from == to) return amount
        val f = get(from).rate
        val t = get(to).rate
        return (amount / f) * t
    }

    /**
     * Matches the web's `formatMoney`: absolute value with US-locale grouping, a
     * leading "-" for negative amounts, and the currency symbol prefixed — every
     * currency (including AED/ZAR) is formatted the same way; the web source has
     * a comment suggesting AED/ZAR should read symbol-after-number, but both its
     * code branches are identical, so this replicates the actual (symbol-always-
     * first) behavior rather than the unimplemented intent.
     */
    fun formatMoney(amount: Double, code: String = "USD"): String {
        val currency = get(code)
        val decimals = if (code in zeroDecimal) 0 else 2
        val symbols = DecimalFormatSymbols(Locale.US)
        val pattern = if (decimals == 0) "#,##0" else "#,##0.${"0".repeat(decimals)}"
        val formatter = DecimalFormat(pattern, symbols).apply {
            roundingMode = RoundingMode.HALF_UP
        }
        val str = formatter.format(BigDecimal(kotlin.math.abs(amount)))
        val sign = if (amount < 0) "-" else ""
        return "$sign${currency.symbol}$str"
    }
}
