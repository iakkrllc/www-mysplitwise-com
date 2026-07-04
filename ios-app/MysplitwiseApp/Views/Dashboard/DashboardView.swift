import SwiftUI
import MysplitwiseCore

struct DashboardView: View {
    @EnvironmentObject var appStore: AppStore
    @State private var isRefreshing = false

    private var friends: [User] {
        appStore.users.filter { $0.id != appStore.currentUserId }
    }

    private var summary: Calculations.BalanceSummary {
        guard let me = appStore.currentUser else {
            return Calculations.BalanceSummary(totalOwed: 0, totalOwe: 0, net: 0)
        }
        return Calculations.summaryForUser(me.id, otherIds: friends.map(\.id), expenses: appStore.baseExpenses)
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(summary.net >= 0 ? "You are owed overall" : "You owe overall")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text(Currency.formatMoney(abs(summary.net), code: appStore.baseCurrency))
                            .font(.largeTitle.bold())
                            .foregroundColor(summary.net >= 0 ? Color(hex: "#22A85A") : Color(hex: "#E63879"))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 8)
                }

                Section("Friends") {
                    if friends.isEmpty {
                        Text("Add a friend to start splitting expenses.")
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(friends) { friend in
                            let bal = Calculations.balanceBetween(appStore.currentUserId, friend.id, expenses: appStore.baseExpenses)
                            if abs(bal) > 0.01 {
                                BalanceRowView(user: friend, amount: bal, currency: appStore.baseCurrency)
                            }
                        }
                    }
                }
            }
            .navigationTitle("mysplitwise")
            .refreshable {
                await appStore.refresh()
            }
            .task {
                await appStore.refresh()
            }
        }
    }
}
