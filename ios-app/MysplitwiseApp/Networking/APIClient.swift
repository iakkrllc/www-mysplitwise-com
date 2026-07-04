import Foundation
import Auth

enum APIError: Error, LocalizedError {
    case requestFailed(status: Int, message: String)
    case noSession

    var errorDescription: String? {
        switch self {
        case .requestFailed(_, let message): return message
        case .noSession: return "You're not signed in"
        }
    }
}

/// Generic bearer-authenticated REST client for the existing `/api/*` Next.js
/// routes — port of `src/lib/api-client.ts`. Every call attaches the current
/// Supabase session's access token exactly like the web app's `apiRequest`.
enum APIClient {
    /// The deployed mysplitwise backend. Same server the website talks to —
    /// there is no separate "mobile API," these are the identical routes.
    static let baseURL = URL(string: "https://mysplitwise.com")!

    /// GET/DELETE calls with no request body — a distinct function (not a
    /// default-parameter overload of the body-taking version below) so the
    /// compiler never has to guess which one you meant.
    static func request<Response: Decodable>(_ method: String, _ path: String) async throws -> Response {
        let request = try await makeRequest(method, path)
        return try await send(request)
    }

    /// POST/PATCH calls with a JSON-encodable request body.
    static func request<Body: Encodable, Response: Decodable>(
        _ method: String,
        _ path: String,
        body: Body
    ) async throws -> Response {
        var request = try await makeRequest(method, path)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        return try await send(request)
    }

    private static func makeRequest(_ method: String, _ path: String) async throws -> URLRequest {
        let session = try await SupabaseClientProvider.shared.session
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        return request
    }

    private static func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let (data, response) = try await URLSession.shared.data(for: request)
        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500

        guard (200...299).contains(statusCode) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
                ?? "Request failed (\(statusCode))"
            throw APIError.requestFailed(status: statusCode, message: message)
        }

        return try JSONDecoder().decode(Response.self, from: data)
    }

    private struct ErrorBody: Decodable { let error: String? }
}
