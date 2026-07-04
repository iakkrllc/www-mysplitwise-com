import SwiftUI
import MysplitwiseCore

struct GroupDetailView: View {
    @EnvironmentObject var appStore: AppStore
    let group: Group

    private var members: [User] {
        group.memberIds.compactMap { appStore.getUser($0) }
    }

    private var debts: [Debt] {
        Calculations.groupDebts(memberIds: group.memberIds, expenses: appStore.baseExpenses, simplify: group.simplifyDebts)
    }

    private var groupExpenses: [Expense] {
        appStore.expenses.filter { $0.groupId == group.id }.sorted { $0.date > $1.date }
    }

    var body: some View {
        List {
            Section("Balances") {
                if debts.isEmpty {
                    Text("Everyone's settled up.").foregroundColor(.secondary)
                } else {
                    ForEach(Array(debts.enumerated()), id: \.offset) { _, debt in
                        if let from = appStore.getUser(debt.from), let to = appStore.getUser(debt.to) {
                            Text("\(from.name) owes \(to.name) \(Currency.formatMoney(debt.amount, code: appStore.baseCurrency))")
                        }
                    }
                }
            }
            Section("Expenses") {
                ForEach(groupExpenses) { expense in
                    VStack(alignment: .leading) {
                        Text(expense.description).font(.body.bold())
                        Text("\(expense.date) · \(Currency.formatMoney(expense.amount, code: expense.currency))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            Section("Members") {
                ForEach(members) { member in
                    Text(member.name)
                }
            }
        }
        .navigationTitle(group.name)
    }
}
