import SwiftUI
import MysplitwiseCore

struct ExpenseListView: View {
    @EnvironmentObject var appStore: AppStore
    @State private var showAddExpense = false
    @State private var selectedExpense: Expense?

    private var sortedExpenses: [Expense] {
        appStore.expenses.sorted { $0.date > $1.date }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(sortedExpenses) { expense in
                    Button {
                        selectedExpense = expense
                    } label: {
                        expenseRow(expense)
                    }
                }
            }
            .navigationTitle("All expenses")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { showAddExpense = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showAddExpense) { AddEditExpenseView() }
            .sheet(item: $selectedExpense) { expense in
                ExpenseDetailView(expense: expense)
            }
        }
    }

    private func expenseRow(_ expense: Expense) -> some View {
        let category = Categories.get(expense.category)
        return HStack {
            Image(systemName: category.sfSymbol)
                .foregroundColor(Color(hex: category.colorHex))
                .frame(width: 32)
            VStack(alignment: .leading) {
                Text(expense.isSettlement ? "Payment" : expense.description).foregroundColor(.primary)
                Text(expense.date).font(.caption).foregroundColor(.secondary)
            }
            Spacer()
            Text(Currency.formatMoney(expense.amount, code: expense.currency))
                .foregroundColor(.primary)
        }
    }
}
