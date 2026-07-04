import Foundation

/// Half-cent epsilon for float comparisons — a balance is only ever treated as
/// truly positive/negative/zero once it clears this threshold. Matches `EPS` in
/// `src/lib/calculations.ts`.
public let EPS: Double = 0.005

/// JS's `Math.round` (and Kotlin's `roundToLong()`) round ties **toward positive
/// infinity** (`Math.round(-0.5) === -0`, not `-1`) — NOT "away from zero".
/// Swift's `Double.rounded()` default rule (`.toNearestOrAwayFromZero`) differs
/// for negative ties, so this replicates JS's exact behavior via the classic
/// `floor(x + 0.5)` formula instead of relying on a built-in rounding rule.
func jsRound(_ x: Double) -> Double {
    (x + 0.5).rounded(.down)
}

/// Standard 2-decimal rounding matching JS's `Math.round((n + Number.EPSILON) * 100) / 100`.
public func round2(_ n: Double) -> Double {
    jsRound(n * 100) / 100
}

public enum Calculations {
    /// Converts a single expense (and its per-share paid/owed amounts) into `base`
    /// currency. Returns the expense unchanged if already in `base`.
    public static func convertExpenseToBase(_ expense: Expense, base: String) -> Expense {
        guard expense.currency != base else { return expense }
        var converted = expense
        converted.amount = round2(Currency.convert(expense.amount, from: expense.currency, to: base))
        converted.shares = expense.shares.map { share in
            var s = share
            s.paid = round2(Currency.convert(share.paid, from: expense.currency, to: base))
            s.owed = round2(Currency.convert(share.owed, from: expense.currency, to: base))
            return s
        }
        converted.currency = base
        return converted
    }

    /// Maps `convertExpenseToBase` over a list — call this before any balance math
    /// so multi-currency expenses are normalized to one currency first.
    public static func toBaseExpenses(_ expenses: [Expense], base: String) -> [Expense] {
        expenses.map { convertExpenseToBase($0, base: base) }
    }

    /// For a single (possibly multi-payer) expense's shares, splits every debtor's
    /// debt proportionally across all creditors weighted by each creditor's share
    /// of the total credit. With a single payer this reduces to "every debtor owes
    /// the one payer their owed amount."
    public static func pairwiseDebts(forShares shares: [ExpenseShare]) -> [Debt] {
        struct Net { let userId: String; let amt: Double }
        let nets = shares.map { (userId: $0.userId, net: $0.paid - $0.owed) }
        let creditors = nets.filter { $0.net > EPS }.map { Net(userId: $0.userId, amt: $0.net) }
        let debtors = nets.filter { $0.net < -EPS }.map { Net(userId: $0.userId, amt: -$0.net) }
        let totalCredit = creditors.reduce(0) { $0 + $1.amt }
        guard totalCredit > 0 else { return [] }

        var debts: [Debt] = []
        for debtor in debtors {
            for creditor in creditors {
                let amount = round2(debtor.amt * (creditor.amt / totalCredit))
                if amount > EPS {
                    debts.append(Debt(from: debtor.userId, to: creditor.userId, amount: amount))
                }
            }
        }
        return debts
    }

    /// Positive result = `otherId` owes `userId`; negative = `userId` owes `otherId`.
    public static func balanceBetween(_ userId: String, _ otherId: String, expenses: [Expense]) -> Double {
        var balance = 0.0
        for expense in expenses {
            for debt in pairwiseDebts(forShares: expense.shares) {
                if debt.from == otherId && debt.to == userId {
                    balance += debt.amount
                } else if debt.from == userId && debt.to == otherId {
                    balance -= debt.amount
                }
            }
        }
        return round2(balance)
    }

    /// Simple sum of paid-owed across all of `userId`'s shares in `expenses` — the
    /// user's total net position, not pairwise against any one other person.
    public static func netBalanceForUser(_ userId: String, expenses: [Expense]) -> Double {
        var total = 0.0
        for expense in expenses {
            for share in expense.shares where share.userId == userId {
                total += share.paid - share.owed
            }
        }
        return round2(total)
    }

    /// Batched `netBalanceForUser` for a set of users.
    public static func netBalances(_ userIds: [String], expenses: [Expense]) -> [String: Double] {
        var balances: [String: Double] = [:]
        for id in userIds { balances[id] = 0 }
        for expense in expenses {
            for share in expense.shares where balances[share.userId] != nil {
                balances[share.userId]! += share.paid - share.owed
            }
        }
        return balances.mapValues { round2($0) }
    }

    /// Greedy largest-vs-largest two-pointer debt simplification — minimizes the
    /// number of transactions needed to settle a group, though not provably minimal
    /// in every case. Sort order and walk order must match exactly for parity with
    /// server-derived output.
    public static func simplifyDebts(_ balances: [String: Double]) -> [Debt] {
        struct Party { var id: String; var amt: Double }
        var creditors = balances.filter { $0.value > EPS }.map { Party(id: $0.key, amt: $0.value) }
        var debtors = balances.filter { $0.value < -EPS }.map { Party(id: $0.key, amt: -$0.value) }
        creditors.sort { $0.amt > $1.amt }
        debtors.sort { $0.amt > $1.amt }

        var debts: [Debt] = []
        var ci = 0
        var di = 0
        while ci < creditors.count && di < debtors.count {
            let amount = round2(min(debtors[di].amt, creditors[ci].amt))
            if amount > EPS {
                debts.append(Debt(from: debtors[di].id, to: creditors[ci].id, amount: amount))
            }
            debtors[di].amt -= amount
            creditors[ci].amt -= amount
            if debtors[di].amt <= EPS { di += 1 }
            if creditors[ci].amt <= EPS { ci += 1 }
        }
        return debts
    }

    /// `simplify == true`: net-balance simplification across the whole group.
    /// `simplify == false`: direct pairwise balances between every unordered pair.
    public static func groupDebts(memberIds: [String], expenses: [Expense], simplify: Bool) -> [Debt] {
        if simplify {
            return simplifyDebts(netBalances(memberIds, expenses: expenses))
        }
        var debts: [Debt] = []
        for i in 0..<memberIds.count {
            for j in (i + 1)..<memberIds.count {
                let a = memberIds[i]
                let b = memberIds[j]
                let bal = balanceBetween(a, b, expenses: expenses)
                if bal > EPS {
                    debts.append(Debt(from: b, to: a, amount: bal))
                } else if bal < -EPS {
                    debts.append(Debt(from: a, to: b, amount: -bal))
                }
            }
        }
        return debts
    }

    public struct BalanceSummary {
        public let totalOwed: Double
        public let totalOwe: Double
        public let net: Double
    }

    public static func summaryForUser(_ userId: String, otherIds: [String], expenses: [Expense]) -> BalanceSummary {
        var totalOwed = 0.0
        var totalOwe = 0.0
        for otherId in otherIds {
            let bal = balanceBetween(userId, otherId, expenses: expenses)
            if bal > 0 { totalOwed += bal } else { totalOwe += -bal }
        }
        totalOwed = round2(totalOwed)
        totalOwe = round2(totalOwe)
        return BalanceSummary(totalOwed: totalOwed, totalOwe: totalOwe, net: round2(totalOwed - totalOwe))
    }
}
