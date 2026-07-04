package com.mysplitwise.app.network

import com.mysplitwise.app.di.NetworkModule
import io.github.jan.supabase.auth.auth
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.header
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.HttpMethod
import io.ktor.http.contentType
import io.ktor.http.ContentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.SerializationException

class ApiException(val status: Int, message: String) : Exception(message)

/**
 * Generic bearer-authenticated REST client for the existing Next.js backend
 * routes — port of `src/lib/api-client.ts`. Every call attaches the current
 * Supabase session's access token exactly like the web app's `apiRequest`.
 */
object ApiClient {
    /** The deployed mysplitwise backend — the identical routes the website calls, no separate "mobile API." */
    private const val BASE_URL = "https://mysplitwise.com/"

    // `encodeDefaults` deliberately left at its default (false): a patch field left
    // at its `null` default is omitted from the JSON entirely (not sent as an
    // explicit `null`), matching every route's "only present keys are applied"
    // PATCH semantics.
    private val json = Json { ignoreUnknownKeys = true }

    private val http: HttpClient by lazy {
        HttpClient(OkHttp) {
            install(ContentNegotiation) { json(json) }
        }
    }

    /** GET/DELETE with no request body. */
    suspend inline fun <reified Response> request(method: HttpMethod, path: String): Response {
        val response = send(method, path) { }
        return decode(response)
    }

    /** POST/PATCH with a JSON-encodable request body. */
    suspend inline fun <reified Body, reified Response> request(method: HttpMethod, path: String, body: Body): Response {
        val response = send(method, path) {
            contentType(ContentType.Application.Json)
            setBody(body)
        }
        return decode(response)
    }

    suspend fun send(method: HttpMethod, path: String, configure: io.ktor.client.request.HttpRequestBuilder.() -> Unit): HttpResponse {
        val accessToken = NetworkModule.supabase.auth.currentSessionOrNull()?.accessToken
            ?: throw ApiException(401, "You're not signed in")
        return http.request(BASE_URL + path) {
            this.method = method
            header("Authorization", "Bearer $accessToken")
            configure()
        }
    }

    suspend inline fun <reified Response> decode(response: HttpResponse): Response {
        if (!response.status.isSuccess()) {
            val message = try {
                response.body<ErrorBody>().error ?: "Request failed (${response.status.value})"
            } catch (e: SerializationException) {
                "Request failed (${response.status.value})"
            }
            throw ApiException(response.status.value, message)
        }
        return response.body()
    }
}

@kotlinx.serialization.Serializable
data class ErrorBody(val error: String? = null)
