import SwiftUI
import UIKit
import MysplitwiseCore

/// Records a payment and, if the recipient has a payment handle on file,
/// offers to open Venmo/PayPal/Cash App with the amount pre-filled.
/// mysplitwise never processes the payment itself — only the deep link.
struct SettleUpView: View {
    @EnvironmentObject var appStore: AppStore
    @Environment(\.dismiss) private var dismiss
    let counterpart: User
    /// Positive: counterpart owes the current user. Negative: current user owes counterpart.
    let suggestedAmount: Double

    @State private var amountText: String
    @State private var isSaving = false

    init(counterpart: User, suggestedAmount: Double) {
        self.counterpart = counterpart
        self.suggestedAmount = suggestedAmount
        _amountText = State(initialValue: String(format: "%.2f", abs(suggestedAmount)))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Text("Amount")
                        Spacer()
                        TextField("0.00", text: $amountText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                }
                if suggestedAmount < 0 {
                    Section {
                        let options = PaymentLinks.payOptions(
                            for: counterpart, amount: Double(amountText) ?? 0, note: "mysplitwise settle up"
                        )
                        if options.isEmpty {
                            Text("\(counterpart.name) hasn't added a payment handle yet — this will just mark the balance as settled.")
                                .foregroundColor(.secondary)
                        } else {
                            ForEach(options, id: \.url) { option in
                                Button(option.label) {
                                    if let url = URL(string: option.url) {
                                        UIApplication.shared.open(url)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Settle up with \(counterpart.name)")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Mark as paid") { save() }
                        .disabled(isSaving || (Double(amountText) ?? 0) <= 0)
                }
            }
        }
    }

    private func save() {
        guard let amount = Double(amountText), amount > 0 else { return }
        isSaving = true
        let payment: SyncAPI.Payment = suggestedAmount < 0
            ? .init(fromId: appStore.currentUserId, toId: counterpart.id, amount: amount, currency: appStore.baseCurrency, groupId: nil)
            : .init(fromId: counterpart.id, toId: appStore.currentUserId, amount: amount, currency: appStore.baseCurrency, groupId: nil)
        Task {
            await appStore.addSettlements([payment])
            isSaving = false
            dismiss()
        }
    }
}
