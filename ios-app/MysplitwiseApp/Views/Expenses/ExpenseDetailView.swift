import SwiftUI
import MysplitwiseCore

struct ExpenseDetailView: View {
    @EnvironmentObject var appStore: AppStore
    @Environment(\.dismiss) private var dismiss
    let expense: Expense
    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(expense.isSettlement ? "Payment" : expense.description).font(.title3.bold())
                    Text(Currency.formatMoney(expense.amount, code: expense.currency)).font(.title2)
                    Text(expense.date).foregroundColor(.secondary)
                }
                Section("Split") {
                    ForEach(expense.shares, id: \.userId) { share in
                        if let user = appStore.getUser(share.userId) {
                            HStack {
                                Text(user.name)
                                Spacer()
                                if share.paid > 0.001 {
                                    Text("paid \(Currency.formatMoney(share.paid, code: expense.currency))")
                                }
                                Text("owes \(Currency.formatMoney(share.owed, code: expense.currency))")
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                if let notes = expense.notes, !notes.isEmpty {
                    Section("Notes") { Text(notes) }
                }
                Section {
                    Button("Delete expense", role: .destructive) {
                        showDeleteConfirm = true
                    }
                }
            }
            .navigationTitle("Expense")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
            .confirmationDialog("Delete this expense?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    Task {
                        await appStore.deleteExpense(id: expense.id)
                        dismiss()
                    }
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }
}
