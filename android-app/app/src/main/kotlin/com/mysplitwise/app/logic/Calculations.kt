package com.mysplitwise.app.logic

import com.mysplitwise.app.model.Debt
import com.mysplitwise.app.model.Expense
import com.mysplitwise.app.model.ExpenseShare
import kotlin.math.roundToLong

/**
 * Half-cent epsilon for float comparisons — a balance is only ever treated as
 * truly positive/negative/zero once it clears this threshold. Matches `EPS` in
 * `src/lib/calculations.ts`.
 */
const val EPS: Double = 0.005

/**
 * Standard 2-decimal rounding matching JS's `Math.round((n + Number.EPSILON) * 100) / 100`.
 * Kotlin's `roundToLong()` already rounds ties toward positive infinity, exactly
 * like JS's `Math.round` (`Math.round(-0.5) === -0`, not `-1`) — no extra care
 * needed here, unlike the iOS port where Swift's default rounding rule differs.
 */
fun round2(n: Double): Double = (n * 100).roundToLong() / 100.0

object Calculations {
    /** Converts a single expense (and its per-share paid/owed amounts) into [base] currency. */
    fun convertExpenseToBase(expense: Expense, base: String): Expense {
        if (expense.currency == base) return expense
        return expense.copy(
            amount = round2(Currency.convert(expense.amount, expense.currency, base)),
            currency = base,
            shares = expense.shares.map { share ->
                share.copy(
                    paid = round2(Currency.convert(share.paid, expense.currency, base)),
                    owed = round2(Currency.convert(share.owed, expense.currency, base)),
                )
            },
        )
    }

    /** Maps [convertExpenseToBase] over a list — call before any balance math. */
    fun toBaseExpenses(expenses: List<Expense>, base: String): List<Expense> =
        expenses.map { convertExpenseToBase(it, base) }

    /**
     * For a single (possibly multi-payer) expense's shares, splits every
     * debtor's debt proportionally across all creditors weighted by each
     * creditor's share of the total credit.
     */
    fun pairwiseDebts(shares: List<ExpenseShare>): List<Debt> {
        val nets = shares.map { it.userId to (it.paid - it.owed) }
        val creditors = nets.filter { it.second > EPS }
        val debtors = nets.filter { it.second < -EPS }.map { it.first to -it.second }
        val totalCredit = creditors.sumOf { it.second }
        if (totalCredit <= 0) return emptyList()

        val debts = mutableListOf<Debt>()
        for ((debtorId, debtorAmt) in debtors) {
            for ((creditorId, creditorAmt) in creditors) {
                val amount = round2(debtorAmt * (creditorAmt / totalCredit))
                if (amount > EPS) {
                    debts.add(Debt(from = debtorId, to = creditorId, amount = amount))
                }
            }
        }
        return debts
    }

    /** Positive result = [otherId] owes [userId]; negative = [userId] owes [otherId]. */
    fun balanceBetween(userId: String, otherId: String, expenses: List<Expense>): Double {
        var balance = 0.0
        for (expense in expenses) {
            for (debt in pairwiseDebts(expense.shares)) {
                if (debt.from == otherId && debt.to == userId) balance += debt.amount
                else if (debt.from == userId && debt.to == otherId) balance -= debt.amount
            }
        }
        return round2(balance)
    }

    /** [userId]'s total net position across all of [expenses] — not pairwise. */
    fun netBalanceForUser(userId: String, expenses: List<Expense>): Double {
        var total = 0.0
        for (expense in expenses) {
            for (share in expense.shares) {
                if (share.userId == userId) total += share.paid - share.owed
            }
        }
        return round2(total)
    }

    /** Batched [netBalanceForUser] for a set of users. */
    fun netBalances(userIds: List<String>, expenses: List<Expense>): Map<String, Double> {
        val balances = userIds.associateWith { 0.0 }.toMutableMap()
        for (expense in expenses) {
            for (share in expense.shares) {
                if (balances.containsKey(share.userId)) {
                    balances[share.userId] = balances.getValue(share.userId) + (share.paid - share.owed)
                }
            }
        }
        return balances.mapValues { round2(it.value) }
    }

    /**
     * Greedy largest-vs-largest two-pointer debt simplification. Sort order and
     * walk order must match exactly for parity with server-derived output.
     */
    fun simplifyDebts(balances: Map<String, Double>): List<Debt> {
        data class Party(val id: String, var amt: Double)

        val creditors = balances.filter { it.value > EPS }
            .map { Party(it.key, it.value) }
            .sortedByDescending { it.amt }
            .toMutableList()
        val debtors = balances.filter { it.value < -EPS }
            .map { Party(it.key, -it.value) }
            .sortedByDescending { it.amt }
            .toMutableList()

        val debts = mutableListOf<Debt>()
        var ci = 0
        var di = 0
        while (ci < creditors.size && di < debtors.size) {
            val amount = round2(minOf(debtors[di].amt, creditors[ci].amt))
            if (amount > EPS) {
                debts.add(Debt(from = debtors[di].id, to = creditors[ci].id, amount = amount))
            }
            debtors[di].amt -= amount
            creditors[ci].amt -= amount
            if (debtors[di].amt <= EPS) di++
            if (creditors[ci].amt <= EPS) ci++
        }
        return debts
    }

    /**
     * `simplify == true`: net-balance simplification across the whole group.
     * `simplify == false`: direct pairwise balances between every unordered pair.
     */
    fun groupDebts(memberIds: List<String>, expenses: List<Expense>, simplify: Boolean): List<Debt> {
        if (simplify) return simplifyDebts(netBalances(memberIds, expenses))

        val debts = mutableListOf<Debt>()
        for (i in memberIds.indices) {
            for (j in (i + 1) until memberIds.size) {
                val a = memberIds[i]
                val b = memberIds[j]
                val bal = balanceBetween(a, b, expenses)
                if (bal > EPS) debts.add(Debt(from = b, to = a, amount = bal))
                else if (bal < -EPS) debts.add(Debt(from = a, to = b, amount = -bal))
            }
        }
        return debts
    }

    data class BalanceSummary(val totalOwed: Double, val totalOwe: Double, val net: Double)

    fun summaryForUser(userId: String, otherIds: List<String>, expenses: List<Expense>): BalanceSummary {
        var totalOwed = 0.0
        var totalOwe = 0.0
        for (otherId in otherIds) {
            val bal = balanceBetween(userId, otherId, expenses)
            if (bal > 0) totalOwed += bal else totalOwe += -bal
        }
        totalOwed = round2(totalOwed)
        totalOwe = round2(totalOwe)
        return BalanceSummary(totalOwed, totalOwe, round2(totalOwed - totalOwe))
    }
}
