import SwiftUI
import MysplitwiseCore

enum SplitMethod: String, CaseIterable {
    case equal, exact, percentage, shares
    var label: String {
        switch self {
        case .equal: return "Equal"
        case .exact: return "Exact"
        case .percentage: return "%"
        case .shares: return "Shares"
        }
    }
}

/// Builds the `shares` array for an expense given a total amount, the payer,
/// participants, and a split method — mirrors `SplitEditor`/`add-expense-dialog.tsx`
/// on the web, using the exact same `Split` math ported to `MysplitwiseCore`.
struct SplitEditorView: View {
    let amount: Double
    let participants: [User]
    @Binding var payerId: String
    @Binding var method: SplitMethod
    /// Raw per-participant input for exact/percentage/shares modes (participant id -> entered value).
    @Binding var rawValues: [String: Double]

    var computedShares: [ExpenseShare] {
        guard !participants.isEmpty, amount > 0 else { return [] }
        let ids = participants.map(\.id)
        let owedAmounts: [Double]
        switch method {
        case .equal:
            owedAmounts = Split.equal(amount: amount, n: ids.count)
        case .exact:
            owedAmounts = ids.map { rawValues[$0] ?? 0 }
        case .percentage:
            owedAmounts = Split.byPercent(amount: amount, percents: ids.map { rawValues[$0] ?? 0 })
        case .shares:
            owedAmounts = Split.byShares(amount: amount, shares: ids.map { rawValues[$0] ?? 0 })
        }
        var shares = zip(ids, owedAmounts).map { ExpenseShare(userId: $0, paid: 0, owed: $1) }
        if let payerIdx = shares.firstIndex(where: { $0.userId == payerId }) {
            shares[payerIdx].paid = amount
        }
        return shares
    }

    private var exactTotal: Double {
        participants.reduce(0) { $0 + (rawValues[$1.id] ?? 0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Picker("Split", selection: $method) {
                ForEach(SplitMethod.allCases, id: \.self) { Text($0.label).tag($0) }
            }
            .pickerStyle(.segmented)

            Picker("Paid by", selection: $payerId) {
                ForEach(participants) { user in
                    Text(user.name).tag(user.id)
                }
            }

            ForEach(participants) { user in
                HStack {
                    Text(user.name)
                    Spacer()
                    switch method {
                    case .equal:
                        if let owed = computedShares.first(where: { $0.userId == user.id })?.owed {
                            Text(Currency.formatMoney(owed, code: "USD")).foregroundColor(.secondary)
                        }
                    case .exact, .percentage, .shares:
                        TextField(
                            method == .percentage ? "%" : (method == .shares ? "shares" : "0.00"),
                            value: Binding(
                                get: { rawValues[user.id] ?? 0 },
                                set: { rawValues[user.id] = $0 }
                            ),
                            format: .number
                        )
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                    }
                }
            }

            if method == .exact {
                let diff = round2(amount - exactTotal)
                if abs(diff) > 0.001 {
                    Text(diff > 0 ? "\(Currency.formatMoney(diff, code: "USD")) left to assign" : "Over by \(Currency.formatMoney(-diff, code: "USD"))")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
        }
    }
}
