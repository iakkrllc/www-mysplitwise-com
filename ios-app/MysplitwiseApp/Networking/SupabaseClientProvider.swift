import Foundation
import Auth

/// Reads the Supabase project URL/anon key that `Configs/*.xcconfig` inject into
/// Info.plist (see `MysplitwiseSupabaseURL`/`MysplitwiseSupabaseAnonKey`), and
/// builds the one shared `AuthClient` (from the `Auth` product of supabase-swift)
/// used for every sign-up/sign-in/OTP/session call. Only the `Auth` module is
/// used — everything else goes through `APIClient` to the existing `/api/*`
/// Next.js routes, exactly like the web app never talks to Postgrest directly.
///
/// NOTE: this file's exact `AuthClient` initializer should be double-checked
/// against the installed supabase-swift version the first time this builds in
/// Xcode (only possible on a Mac) — the shape here matches the package's
/// documented/standard usage as of this writing, but Xcode's own compiler
/// error messages are the fastest way to catch any signature drift.
enum SupabaseClientProvider {
    static let supabaseURL: URL = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "MysplitwiseSupabaseURL") as? String,
            let url = URL(string: raw)
        else {
            fatalError("MysplitwiseSupabaseURL missing or invalid in Info.plist")
        }
        return url
    }()

    static let supabaseAnonKey: String = {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "MysplitwiseSupabaseAnonKey") as? String else {
            fatalError("MysplitwiseSupabaseAnonKey missing in Info.plist")
        }
        return key
    }()

    static let shared: AuthClient = AuthClient(
        url: supabaseURL.appendingPathComponent("auth/v1"),
        headers: ["apikey": supabaseAnonKey],
        localStorage: AuthClient.Configuration.defaultLocalStorage,
        logger: nil
    )
}
