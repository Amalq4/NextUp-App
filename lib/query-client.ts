/**
 * query-client.ts — React Query client and API request utilities
 *
 * This file is the networking layer between the Expo frontend and the
 * Express backend. All API calls should use these helpers rather than
 * calling fetch() directly.
 *
 * Exports:
 *   getApiUrl()     — resolves the backend base URL from the environment
 *   apiRequest()    — typed fetch wrapper for mutations (POST/PUT/DELETE)
 *   getQueryFn()    — factory for React Query queryFn (GET requests)
 *   queryClient     — the singleton QueryClient used throughout the app
 *
 * Network notes:
 *   - Uses `expo/fetch` instead of the native fetch so streaming responses
 *     (e.g. OpenAI SSE) work on all platforms including iOS/Android.
 *   - The base URL is derived from EXPO_PUBLIC_DOMAIN to avoid hardcoding
 *     hostnames — this works in both Replit dev and production deployments.
 */

import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

// ─── URL Resolution ───────────────────────────────────────────────────────────

/**
 * Returns the base URL for the Express API server.
 *
 * In development (Replit): EXPO_PUBLIC_DOMAIN is set to the Replit dev domain,
 * e.g. "myapp.username.repl.co", and this function returns "https://myapp.username.repl.co/".
 *
 * In production: the same env var is set to the deployment domain.
 *
 * @throws Error if EXPO_PUBLIC_DOMAIN is not set (prevents silent empty-string bugs)
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  let url = new URL(`https://${host}`);

  return url.href; // Always ends with "/"
}

// ─── Response Validation ──────────────────────────────────────────────────────

/**
 * Throws a descriptive error when the server returns a non-2xx status code.
 * The error message includes the status code and the response body text
 * so debugging failed requests is easier.
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// ─── Mutation Helper ──────────────────────────────────────────────────────────

/**
 * Sends a request to the API with an optional JSON body.
 * Use this in React Query mutations:
 *
 *   const mutation = useMutation({
 *     mutationFn: () => apiRequest('POST', '/api/lists', { mediaId: 123 }),
 *   });
 *
 * @param method  — HTTP verb (GET, POST, PUT, DELETE, PATCH)
 * @param route   — API path relative to the base URL (e.g. "/api/tmdb/search")
 * @param data    — Optional request body (will be JSON-encoded)
 * @returns       The raw Response object (call .json() to parse the body)
 * @throws        Error if the response status is not 2xx
 */
export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Send cookies for session-based auth
  });

  await throwIfResNotOk(res);
  return res;
}

// ─── Query Function Factory ───────────────────────────────────────────────────

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Creates a React Query queryFn that fetches a URL built from the query key.
 *
 * The query key array is joined with "/" to form the request path, so:
 *   queryKey: ['/api/tmdb/tv', '123']  →  GET /api/tmdb/tv/123
 *
 * @param options.on401  — What to do on a 401 Unauthorized response:
 *   "returnNull"  — return null (used for optional auth checks)
 *   "throw"       — throw an error (default; triggers React Query's error state)
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    // Join the query key array into a URL path
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    // Handle 401 according to the caller's preference
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// ─── Query Client Singleton ───────────────────────────────────────────────────

/**
 * The single React Query client instance for the whole app.
 *
 * Default query behaviour:
 *   - staleTime: Infinity  → data is never considered stale; only refetches when
 *     explicitly invalidated (queryClient.invalidateQueries). This suits a
 *     local-first app where server data doesn't change between sessions.
 *   - retry: false         → don't retry failed requests automatically
 *   - refetchInterval: false / refetchOnWindowFocus: false → no background polling
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
