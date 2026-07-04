import SwiftUI
import MysplitwiseCore

struct AddEditExpenseView: View {
    @EnvironmentObject var appStore: AppStore
    @Environment(\.dismiss) private var dismiss

    let groupId: String?
    let preselectedFriendId: String?

    @State private var description = ""
    @State private var amountText = ""
    @State private var date = Date()
    @State private var categoryId = "general"
    @State private var showCategoryPicker = false
    @State private var payerId: String = ""
    @State private var selectedParticipantIds: Set<String> = []
    @State private var method: SplitMethod = .equal
    @State private var rawValues: [String: Double] = [:]
    @State private var isSaving = false

    init(groupId: String? = nil, preselectedFriendId: String? = nil) {
        self.groupId = groupId
        self.preselectedFriendId = preselectedFriendId
    }

    private var candidateParticipants: [User] {
        if let groupId, let group = appStore.getGroup(groupId) {
            return group.memberIds.compactMap { appStore.getUser($0) }
        }
        return appStore.users
    }

    private var participants: [User] {
        candidateParticipants.filter { selectedParticipantIds.contains($0.id) }
    }

    private var category: CategoryInfo { Categories.get(categoryId) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Description", text: $description)
                    HStack {
                        Text("Amount")
                        Spacer()
                        TextField("0.00", text: $amountText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                    NavigationLink {
                        CategoryPickerView(selectedId: $categoryId)
                    } label: {
                        HStack {
                            Text("Category")
                            Spacer()
                            Image(systemName: category.sfSymbol).foregroundColor(Color(hex: category.colorHex))
                            Text(category.name).foregroundColor(.secondary)
                        }
                    }
                }

                Section("Split with") {
                    ForEach(candidateParticipants) { user in
                        Button {
                            toggle(user.id)
                        } label: {
                            HStack {
                                Text(user.name).foregroundColor(.primary)
                                Spacer()
                                if selectedParticipantIds.contains(user.id) {
                                    Image(systemName: "checkmark").foregroundColor(.accentColor)
                                }
                            }
                        }
                    }
                }

                if participants.count >= 2, let amount = Double(amountText), amount > 0 {
                    Section("How to split") {
                        SplitEditorView(
                            amount: amount, participants: participants, payerId: $payerId,
                            method: $method, rawValues: $rawValues
                        )
                    }
                }
            }
            .navigationTitle("Add expense")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") { save() }
                        .disabled(!canSave || isSaving)
                }
            }
            .onAppear {
                payerId = appStore.currentUserId
                selectedParticipantIds = [appStore.currentUserId]
                if let preselectedFriendId { selectedParticipantIds.insert(preselectedFriendId) }
                if let groupId, let group = appStore.getGroup(groupId) {
                    selectedParticipantIds.formUnion(group.memberIds)
                }
            }
        }
    }

    private var canSave: Bool {
        !description.trimmingCharacters(in: .whitespaces).isEmpty
            && (Double(amountText) ?? 0) > 0
            && participants.count >= 2
    }

    private func toggle(_ id: String) {
        if selectedParticipantIds.contains(id) {
            selectedParticipantIds.remove(id)
        } else {
            selectedParticipantIds.insert(id)
        }
    }

    private func save() {
        guard let amount = Double(amountText) else { return }
        isSaving = true
        let editor = SplitEditorView(
            amount: amount, participants: participants, payerId: $payerId, method: $method, rawValues: $rawValues
        )
        let newExpense = SyncAPI.NewExpense(
            description: description.trimmingCharacters(in: .whitespaces),
            amount: round2(amount),
            currency: appStore.baseCurrency,
            category: categoryId,
            date: Dates.toISODateLocal(date),
            groupId: groupId,
            shares: editor.computedShares
        )
        Task {
            await appStore.addExpense(newExpense)
            isSaving = false
            dismiss()
        }
    }
}
