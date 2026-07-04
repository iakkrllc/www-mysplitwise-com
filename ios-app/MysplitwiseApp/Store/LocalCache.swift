import Foundation
import MysplitwiseCore

/// Server-is-source-of-truth resilience cache — port of `store.tsx`'s
/// localStorage philosophy. One JSON file per signed-in user (namespaced by
/// Supabase user id, mirroring `mysplitwise.state.v1.<userId>`), used only to
/// paint the UI instantly on next launch and survive a brief network outage —
/// never treated as authoritative. Deliberately a flat file, not Core Data/
/// SwiftData: dataset size and lack of complex local queries don't justify
/// the schema-migration overhead at Phase 1's scale.
enum LocalCache {
    private static var directory: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    }

    private static func fileURL(userId: String) -> URL {
        directory.appendingPathComponent("mysplitwise.state.v1.\(userId).json")
    }

    static func load(userId: String) -> PullResponse? {
        let url = fileURL(userId: userId)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(PullResponse.self, from: data)
    }

    static func save(userId: String, state: PullResponse) {
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let data = try JSONEncoder().encode(state)
            try data.write(to: fileURL(userId: userId), options: .atomic)
        } catch {
            // Best-effort cache — a write failure just means next launch falls
            // back to a blank state until the next successful pull.
        }
    }

    static func clear(userId: String) {
        try? FileManager.default.removeItem(at: fileURL(userId: userId))
    }
}
