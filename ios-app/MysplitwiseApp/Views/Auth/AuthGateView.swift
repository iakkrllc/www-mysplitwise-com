import SwiftUI

/// Root router: shows the sign-in flow when signed out, otherwise the main
/// tabbed app. `AppStore` is created fresh whenever the signed-in user id
/// changes (e.g. after sign-out/sign-in as someone else).
struct AuthGateView: View {
    @EnvironmentObject var authStore: AuthStore

    var body: some View {
        Group {
            if authStore.isLoading {
                ProgressView()
            } else if let userId = authStore.userId {
                MainTabView(appStore: AppStore(currentUserId: userId))
            } else {
                SignInView()
            }
        }
    }
}

private struct MainTabView: View {
    @StateObject var appStore: AppStore

    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "house") }
            ExpenseListView()
                .tabItem { Label("Expenses", systemImage: "list.bullet") }
            FriendsListView()
                .tabItem { Label("Friends", systemImage: "person.2") }
            GroupsListView()
                .tabItem { Label("Groups", systemImage: "folder") }
            NotificationBellView()
                .tabItem { Label("Activity", systemImage: "bell") }
            AccountSettingsView()
                .tabItem { Label("Account", systemImage: "gearshape") }
        }
        .environmentObject(appStore)
    }
}
