import SwiftUI
import MysplitwiseCore

struct CreateEditGroupView: View {
    @EnvironmentObject var appStore: AppStore
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var type: GroupType = .trip
    @State private var selectedFriendIds: Set<String> = []
    @State private var isSaving = false

    private var friends: [User] { appStore.users.filter { $0.id != appStore.currentUserId } }

    var body: some View {
        NavigationStack {
            Form {
                Section("Group name") {
                    TextField("e.g. Cabo Trip", text: $name)
                }
                Section("Type") {
                    Picker("Type", selection: $type) {
                        Text("Trip").tag(GroupType.trip)
                        Text("Home").tag(GroupType.home)
                        Text("Couple").tag(GroupType.couple)
                        Text("Other").tag(GroupType.other)
                    }
                    .pickerStyle(.segmented)
                }
                Section("Members") {
                    ForEach(friends) { friend in
                        Button {
                            if selectedFriendIds.contains(friend.id) {
                                selectedFriendIds.remove(friend.id)
                            } else {
                                selectedFriendIds.insert(friend.id)
                            }
                        } label: {
                            HStack {
                                Text(friend.name).foregroundColor(.primary)
                                Spacer()
                                if selectedFriendIds.contains(friend.id) {
                                    Image(systemName: "checkmark").foregroundColor(.accentColor)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("New group")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Create") { save() }
                        .disabled(isSaving || name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() {
        isSaving = true
        Task {
            await appStore.addGroup(name: name, type: type, memberIds: Array(selectedFriendIds))
            dismiss()
        }
    }
}
