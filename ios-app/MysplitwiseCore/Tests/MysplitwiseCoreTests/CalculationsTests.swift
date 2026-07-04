import XCTest
@testable import MysplitwiseCore

final class CalculationsTests: XCTestCase {
    func makeExpense(id: String, amount: Double, shares: [ExpenseShare], currency: String = "USD") -> Expense {
        Expense(
            id: id, description: "test", amount: amount, currency: currency, category: "general",
            date: "2026-01-01", groupId: nil, shares: shares, createdBy: shares.first?.userId ?? "a",
            createdAt: "2026-01-01T00:00:00Z", isSettlement: false
        )
    }

    func testRound2() {
        // Values well clear of the exact .xx5 boundary, which is inherently
        // float-representation-sensitive (identically so in JS and Swift,
        // both IEEE 754 doubles) and not a meaningful portability check.
        XCTAssertEqual(round2(1.049), 1.05, accuracy: 0.0001)
        XCTAssertEqual(round2(1.044), 1.04, accuracy: 0.0001)
        XCTAssertEqual(round2(-1.049), -1.05, accuracy: 0.0001)
    }

    func testBalanceBetweenSinglePayer() {
        // Alice pays 100, split equally between Alice and Bob -> Bob owes Alice 50.
        let expense = makeExpense(id: "e1", amount: 100, shares: [
            ExpenseShare(userId: "alice", paid: 100, owed: 50),
            ExpenseShare(userId: "bob", paid: 0, owed: 50),
        ])
        XCTAssertEqual(Calculations.balanceBetween("alice", "bob", expenses: [expense]), 50)
        XCTAssertEqual(Calculations.balanceBetween("bob", "alice", expenses: [expense]), -50)
    }

    func testNetBalanceForUser() {
        let expense = makeExpense(id: "e1", amount: 100, shares: [
            ExpenseShare(userId: "alice", paid: 100, owed: 50),
            ExpenseShare(userId: "bob", paid: 0, owed: 50),
        ])
        XCTAssertEqual(Calculations.netBalanceForUser("alice", expenses: [expense]), 50)
        XCTAssertEqual(Calculations.netBalanceForUser("bob", expenses: [expense]), -50)
    }

    func testSimplifyDebtsThreeWay() {
        // Alice net +30, Bob net -10, Carol net -20 -> Carol pays Alice 20, Bob pays Alice 10
        // (greedy largest-vs-largest: creditor Alice(30) matched against largest debtor Carol(20) first).
        let balances: [String: Double] = ["alice": 30, "bob": -10, "carol": -20]
        let debts = Calculations.simplifyDebts(balances)
        XCTAssertEqual(debts.count, 2)
        XCTAssertTrue(debts.contains { $0.from == "carol" && $0.to == "alice" && abs($0.amount - 20) < 0.01 })
        XCTAssertTrue(debts.contains { $0.from == "bob" && $0.to == "alice" && abs($0.amount - 10) < 0.01 })
    }

    func testSummaryForUser() {
        let e1 = makeExpense(id: "e1", amount: 100, shares: [
            ExpenseShare(userId: "alice", paid: 100, owed: 50),
            ExpenseShare(userId: "bob", paid: 0, owed: 50),
        ])
        let e2 = makeExpense(id: "e2", amount: 60, shares: [
            ExpenseShare(userId: "carol", paid: 60, owed: 20),
            ExpenseShare(userId: "alice", paid: 0, owed: 40),
        ])
        let summary = Calculations.summaryForUser("alice", otherIds: ["bob", "carol"], expenses: [e1, e2])
        XCTAssertEqual(summary.totalOwed, 50) // bob owes alice 50
        XCTAssertEqual(summary.totalOwe, 40) // alice owes carol 40
        XCTAssertEqual(summary.net, 10)
    }

    func testPairwiseDebtsMultiPayerFanOut() {
        // Alice paid 60, Bob paid 40 (total 100), split equally 3 ways among alice/bob/carol (33.34/33.33/33.33).
        let shares = [
            ExpenseShare(userId: "alice", paid: 60, owed: 33.34),
            ExpenseShare(userId: "bob", paid: 40, owed: 33.33),
            ExpenseShare(userId: "carol", paid: 0, owed: 33.33),
        ]
        let debts = Calculations.pairwiseDebts(forShares: shares)
        // Carol (debtor, owes 33.33) should fan out proportionally across both creditors (alice net +26.66, bob net +6.67).
        XCTAssertTrue(debts.allSatisfy { $0.from == "carol" })
        XCTAssertEqual(debts.reduce(0) { $0 + $1.amount }, 33.33, accuracy: 0.01)
    }
}
