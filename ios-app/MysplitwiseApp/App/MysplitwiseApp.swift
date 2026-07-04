import SwiftUI

@main
struct MysplitwiseApp: App {
    @StateObject private var authStore = AuthStore()

    var body: some Scene {
        WindowGroup {
            AuthGateView()
                .environmentObject(authStore)
        }
    }
}
