package com.mysplitwise.app

import com.mysplitwise.app.logic.Currency
import org.junit.Assert.assertEquals
import org.junit.Test

class CurrencyTest {
    @Test
    fun convertSameCurrencyIsNoOp() {
        assertEquals(42.0, Currency.convert(42.0, "USD", "USD"), 0.0001)
    }

    @Test
    fun convertUsesRateTable() {
        assertEquals(92.0, Currency.convert(100.0, "USD", "EUR"), 0.001)
    }

    @Test
    fun convertRoundTripViaUSD() {
        val eur = Currency.convert(100.0, "USD", "EUR")
        val back = Currency.convert(eur, "EUR", "USD")
        assertEquals(100.0, back, 0.0001)
    }

    @Test
    fun formatMoneyUSD() {
        assertEquals("$1,234.50", Currency.formatMoney(1234.5, "USD"))
    }

    @Test
    fun formatMoneyNegative() {
        assertEquals("-$42.00", Currency.formatMoney(-42.0, "USD"))
    }

    @Test
    fun formatMoneyZeroDecimalCurrency() {
        // JPY has 0 decimals; 1234.5 rounds to 1235 (standard rounding, not truncation).
        assertEquals("¥1,235", Currency.formatMoney(1234.5, "JPY"))
    }

    @Test
    fun formatMoneyUnknownCodeFallsBackToUSD() {
        assertEquals("$10.00", Currency.formatMoney(10.0, "ZZZ"))
    }

    @Test
    fun getUnknownCodeFallsBackToUSD() {
        assertEquals("USD", Currency.get("ZZZ").code)
    }
}
