import { apiRequest } from "./api-client";

/** Calls one of the /api/ai/* routes with the current session's bearer token. */
export async function callAiApi<T = unknown>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>("POST", path, body);
}
