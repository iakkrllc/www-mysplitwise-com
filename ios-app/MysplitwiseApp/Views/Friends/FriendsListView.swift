import SwiftUI
import MysplitwiseCore

struct FriendsListView: View {
    @EnvironmentObject var appStore: AppStore
    @State private var showAddFriend = false

    private var friends: [User] {
        appStore.users.filter { $0.id != appStore.currentUserId }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(friends) { friend in
                    let bal = Calculations.balanceBetween(appStore.currentUserId, friend.id, expenses: appStore.baseExpenses)
                    BalanceRowView(user: friend, amount: bal, currency: appStore.baseCurrency)
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        let friend = friends[index]
                        Task { await appStore.removeFriend(id: friend.id) }
                    }
                }
            }
            .navigationTitle("Friends")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddFriend = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                    }
                }
            }
            .sheet(isPresented: $showAddFriend) {
                AddFriendView()
            }
        }
    }
}
