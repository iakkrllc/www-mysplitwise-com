package com.mysplitwise.app.logic

import com.mysplitwise.app.model.Frequency
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Local-calendar date helpers — port of `src/lib/dates.ts`. Uses `java.time`
 * (natively available since API 26, matching this project's minSdk) and the
 * device's local calendar throughout — never UTC — to avoid the classic
 * "expense shows as yesterday" off-by-one-day bug.
 */
object Dates {
    private val isoFormat: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE // yyyy-MM-dd

    fun toISODateLocal(date: LocalDate): String = date.format(isoFormat)

    /** Today's date as YYYY-MM-DD, in the device's local timezone. */
    fun todayISO(): String = toISODateLocal(LocalDate.now())

    /** Parse a bare "YYYY-MM-DD" date. */
    fun parseLocalDate(dateStr: String): LocalDate = LocalDate.parse(dateStr, isoFormat)

    /** Advance a "YYYY-MM-DD" date by one period of a recurring frequency. */
    fun advanceDate(dateStr: String, freq: Frequency): String {
        val date = parseLocalDate(dateStr)
        val advanced = when (freq) {
            Frequency.WEEKLY -> date.plusDays(7)
            Frequency.MONTHLY -> date.plusMonths(1)
            Frequency.YEARLY -> date.plusYears(1)
        }
        return toISODateLocal(advanced)
    }
}
