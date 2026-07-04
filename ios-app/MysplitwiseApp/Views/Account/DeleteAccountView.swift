import SwiftUI

struct DeleteAccountView: View {
    @EnvironmentObject var appStore: AppStore
    @EnvironmentObject var authStore: AuthStore
    @Environment(\.dismiss) private var dismiss

    @State private var confirmText = ""
    @State private var isDeleting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("This permanently deletes your mysplitwise login and all data associated with it. This can't be undone.")
                        .foregroundColor(.secondary)
                }
                Section {
                    Text("Type DELETE to confirm.")
                    TextField("DELETE", text: $confirmText)
                        .textInputAutocapitalization(.characters)
                }
                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red)
                }
            }
            .navigationTitle("Delete account")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isDeleting ? "Deleting…" : "Delete", role: .destructive) { delete() }
                        .disabled(isDeleting || confirmText != "DELETE")
                }
            }
        }
    }

    private func delete() {
        isDeleting = true
        errorMessage = nil
        Task {
            do {
                try await appStore.deleteAccount()
                try await authStore.signOut()
                dismiss()
            } catch {
                errorMessage = "Couldn't delete your account — try again"
                isDeleting = false
            }
        }
    }
}
