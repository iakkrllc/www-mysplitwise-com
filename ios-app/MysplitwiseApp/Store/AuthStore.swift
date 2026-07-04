import Foundation
import Auth
import Combine

/// Wraps supabase-swift's `AuthClient` for every sign-up/sign-in/OTP/session
/// call — port of `src/lib/auth-store.tsx`. After every successful auth event
/// this fires `POST /api/log-activity` and `POST /api/sync/claim-invites`,
/// exactly like the web app (never a database trigger — see `TECHNICAL.md`'s
/// note on why that broke login once before).
@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var session: Session?
    @Published private(set) var isLoading = true

    private let client = SupabaseClientProvider.shared
    private var authStateTask: Task<Void, Never>?

    var isSignedIn: Bool { session != nil }
    var userId: String? { session?.user.id.uuidString }

    init() {
        authStateTask = Task {
            for await (_, session) in client.authStateChanges {
                self.session = session
                self.isLoading = false
            }
        }
    }

    deinit {
        authStateTask?.cancel()
    }

    // MARK: - Email + password

    func signUp(email: String, password: String, name: String) async throws {
        try await client.signUp(email: email, password: password, data: ["name": .string(name)])
        try await afterAuthSuccess(eventType: "signup")
    }

    func signIn(email: String, password: String) async throws {
        do {
            try await client.signIn(email: email, password: password)
            try await afterAuthSuccess(eventType: "login")
        } catch {
            try? await SyncAPI.logActivity(eventType: "login_failed")
            throw error
        }
    }

    // MARK: - Phone OTP (handles both first-time signup and returning sign-in)

    func sendPhoneOtp(phone: String, name: String?) async throws {
        let data: [String: AnyJSON]? = name.map { ["name": .string($0)] }
        try await client.signInWithOTP(phone: phone, data: data)
    }

    func verifyPhoneOtp(phone: String, code: String) async throws {
        let response = try await client.verifyOTP(phone: phone, token: code, type: .sms)
        // Matches the web's heuristic: an account created in the last 60s is "new."
        let isNewAccount = Date().timeIntervalSince(response.user?.createdAt ?? Date()) < 60
        try await afterAuthSuccess(eventType: isNewAccount ? "signup" : "login")
    }

    // MARK: - Password / phone change (self-service, while signed in)

    func updatePassword(_ newPassword: String) async throws {
        try await client.update(user: UserAttributes(password: newPassword))
    }

    func startPhoneChange(phone: String) async throws {
        try await client.update(user: UserAttributes(phone: phone))
    }

    func confirmPhoneChange(phone: String, code: String) async throws {
        _ = try await client.verifyOTP(phone: phone, token: code, type: .phoneChange)
    }

    // MARK: - Sign out

    func signOut() async throws {
        try await SyncAPI.logActivity(eventType: "logout")
        try await client.signOut()
    }

    // MARK: - Shared post-auth hook

    private func afterAuthSuccess(eventType: String) async throws {
        try? await SyncAPI.logActivity(eventType: eventType)
        try? await SyncAPI.claimInvites()
    }
}
