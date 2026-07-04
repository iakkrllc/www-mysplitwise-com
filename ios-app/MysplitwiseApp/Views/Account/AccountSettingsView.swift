import SwiftUI
import MysplitwiseCore

struct AccountSettingsView: View {
    @EnvironmentObject var appStore: AppStore
    @EnvironmentObject var authStore: AuthStore
    @State private var name = ""
    @State private var showDeleteAccount = false

    var body: some View {
        NavigationStack {
            Form {
                if let user = appStore.currentUser {
                    Section("Profile") {
                        TextField("Name", text: $name)
                            .onAppear { name = user.name }
                        LabeledContent("Email", value: user.email)
                        if let supportId = user.supportId {
                            LabeledContent("Support ID", value: supportId)
                        }
                        Button("Save name") {
                            Task { await appStore.updateProfile(.init(name: name)) }
                        }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || name == user.name)
                    }
                }

                Section("Preferences") {
                    Picker("Base currency", selection: Binding(
                        get: { appStore.baseCurrency },
                        set: { code in Task { await appStore.setBaseCurrency(code) } }
                    )) {
                        ForEach(Currency.all, id: \.code) { currency in
                            Text("\(currency.symbol) \(currency.code)").tag(currency.code)
                        }
                    }
                }

                Section {
                    Button("Sign out", role: .destructive) {
                        Task { try? await authStore.signOut() }
                    }
                }

                Section {
                    Button("Delete account", role: .destructive) {
                        showDeleteAccount = true
                    }
                } footer: {
                    Text("Permanently deletes your mysplitwise login. This can't be undone.")
                }
            }
            .navigationTitle("Account")
            .sheet(isPresented: $showDeleteAccount) {
                DeleteAccountView()
            }
        }
    }
}
