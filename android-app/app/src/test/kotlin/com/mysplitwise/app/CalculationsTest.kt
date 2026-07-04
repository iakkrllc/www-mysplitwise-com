package com.mysplitwise.app

import com.mysplitwise.app.logic.Calculations
import com.mysplitwise.app.logic.round2
import com.mysplitwise.app.model.Expense
import com.mysplitwise.app.model.ExpenseShare
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CalculationsTest {
    private fun makeExpense(id: String, amount: Double, shares: List<ExpenseShare>, currency: String = "USD") = Expense(
        id = id, description = "test", amount = amount, currency = currency, category = "general",
        date = "2026-01-01", groupId = null, shares = shares, createdBy = shares.firstOrNull()?.userId ?: "a",
        createdAt = "2026-01-01T00:00:00Z", isSettlement = false,
    )

    @Test
    fun round2Basic() {
        // Values well clear of the exact .xx5 boundary, which is inherently
        // float-representation-sensitive (identically so in JS/Swift/Kotlin,
        // all IEEE 754 doubles) and not a meaningful portability check.
        assertEquals(1.05, round2(1.049), 0.0001)
        assertEquals(1.04, round2(1.044), 0.0001)
        assertEquals(-1.05, round2(-1.049), 0.0001)
    }

    @Test
    fun balanceBetweenSinglePayer() {
        // Alice pays 100, split equally between Alice and Bob -> Bob owes Alice 50.
        val expense = makeExpense("e1", 100.0, listOf(
            ExpenseShare("alice", 100.0, 50.0),
            ExpenseShare("bob", 0.0, 50.0),
        ))
        assertEquals(50.0, Calculations.balanceBetween("alice", "bob", listOf(expense)), 0.0001)
        assertEquals(-50.0, Calculations.balanceBetween("bob", "alice", listOf(expense)), 0.0001)
    }

    @Test
    fun netBalanceForUser() {
        val expense = makeExpense("e1", 100.0, listOf(
            ExpenseShare("alice", 100.0, 50.0),
            ExpenseShare("bob", 0.0, 50.0),
        ))
        assertEquals(50.0, Calculations.netBalanceForUser("alice", listOf(expense)), 0.0001)
        assertEquals(-50.0, Calculations.netBalanceForUser("bob", listOf(expense)), 0.0001)
    }

    @Test
    fun simplifyDebtsThreeWay() {
        // Alice net +30, Bob net -10, Carol net -20 -> Carol pays Alice 20, Bob pays Alice 10.
        val balances = mapOf("alice" to 30.0, "bob" to -10.0, "carol" to -20.0)
        val debts = Calculations.simplifyDebts(balances)
        assertEquals(2, debts.size)
        assertTrue(debts.any { it.from == "carol" && it.to == "alice" && Math.abs(it.amount - 20.0) < 0.01 })
        assertTrue(debts.any { it.from == "bob" && it.to == "alice" && Math.abs(it.amount - 10.0) < 0.01 })
    }

    @Test
    fun summaryForUser() {
        val e1 = makeExpense("e1", 100.0, listOf(
            ExpenseShare("alice", 100.0, 50.0),
            ExpenseShare("bob", 0.0, 50.0),
        ))
        val e2 = makeExpense("e2", 60.0, listOf(
            ExpenseShare("carol", 60.0, 20.0),
            ExpenseShare("alice", 0.0, 40.0),
        ))
        val summary = Calculations.summaryForUser("alice", listOf("bob", "carol"), listOf(e1, e2))
        assertEquals(50.0, summary.totalOwed, 0.0001) // bob owes alice 50
        assertEquals(40.0, summary.totalOwe, 0.0001) // alice owes carol 40
        assertEquals(10.0, summary.net, 0.0001)
    }

    @Test
    fun pairwiseDebtsMultiPayerFanOut() {
        // Alice paid 60, Bob paid 40 (total 100), split equally 3 ways among alice/bob/carol.
        val shares = listOf(
            ExpenseShare("alice", 60.0, 33.34),
            ExpenseShare("bob", 40.0, 33.33),
            ExpenseShare("carol", 0.0, 33.33),
        )
        val debts = Calculations.pairwiseDebts(shares)
        assertTrue(debts.all { it.from == "carol" })
        assertEquals(33.33, debts.sumOf { it.amount }, 0.01)
    }
}
