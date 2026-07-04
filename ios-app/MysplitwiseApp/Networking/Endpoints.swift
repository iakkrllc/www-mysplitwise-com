import Foundation

/// Path constants for the `/api/*` routes Phase 1 uses. Mirrors the routes
/// referenced by `src/lib/sync-api.ts` — see `TECHNICAL.md` in the web repo
/// for the full API contract.
enum Endpoints {
    static let syncPull = "api/sync/pull"
    static let syncClaimInvites = "api/sync/claim-invites"
    static let logActivity = "api/log-activity"
    static let expenses = "api/expenses"
    static func expense(_ id: String) -> String { "api/expenses/\(id)" }
    static let groups = "api/groups"
    static func group(_ id: String) -> String { "api/groups/\(id)" }
    static let friends = "api/friends"
    static func friend(_ id: String) -> String { "api/friends/\(id)" }
    static func profile(_ id: String) -> String { "api/profiles/\(id)" }
    static let settlements = "api/settlements"
    static let accountDelete = "api/account/delete"
}
