/**
 * routes.ts — Express API routes (TMDB proxy)
 *
 * This file is the only place in the codebase that communicates with TMDB.
 * All client requests go through these proxy endpoints so the TMDB_API_KEY
 * never leaves the server.
 *
 * In-memory response cache:
 *   Results are cached for CACHE_TTL (10 minutes) to avoid hitting TMDB
 *   rate limits and to speed up repeated requests (e.g. multiple users
 *   browsing the same provider section simultaneously).
 *
 * Route summary:
 *   GET /api/tmdb/trending/:mediaType/:timeWindow   Trending content
 *   GET /api/tmdb/search/multi                      Unified movie + TV search
 *   GET /api/tmdb/discover/:mediaType               Genre / provider-filtered discovery
 *   GET /api/tmdb/provider/:providerId/top          Top 10 for a streaming provider
 *   GET /api/tmdb/movie/now_playing                 Currently in theatres (not shown in UI)
 *   GET /api/tmdb/movie/:id                         Movie detail
 *   GET /api/tmdb/tv/:id                            TV show detail
 *   GET /api/tmdb/tv/:id/season/:seasonNumber       Season episode list
 *   GET /api/tmdb/genre/:mediaType/list             Genre list
 */

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

// ─── TMDB Config ──────────────────────────────────────────────────────────────

const TMDB_BASE = "https://api.themoviedb.org/3";

/** API key is injected from the environment — never committed to source code. */
const TMDB_KEY = process.env.TMDB_API_KEY || "";

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

/** Simple Map-based cache: key → { data, timestamp } */
const cache = new Map<string, { data: any; timestamp: number }>();

/** How long a cached response stays valid (10 minutes in milliseconds). */
const CACHE_TTL = 10 * 60 * 1000;

/** Returns cached data if it exists and has not expired, otherwise null. */
function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

/** Stores a result in the cache with the current timestamp. */
function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── TMDB Fetch Helper ────────────────────────────────────────────────────────

/**
 * Makes an authenticated GET request to the TMDB API.
 * Appends the API key to every request automatically so individual handlers
 * don't need to handle auth.
 *
 * @param path    - TMDB API path, e.g. "/trending/movie/week"
 * @param params  - Additional query parameters (genre, region, page, etc.)
 * @throws        - Error with TMDB status code + status text on failure
 */
async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY); // Auth always added last
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── Route Registration ───────────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {

  /**
   * Trending content for movies or TV.
   * Used by the Home screen to show popular content this week.
   *
   * GET /api/tmdb/trending/:mediaType/:timeWindow
   *   mediaType   — 'movie' | 'tv' | 'all'
   *   timeWindow  — 'day' | 'week'
   *   ?page       — pagination (default: 1)
   */
  app.get("/api/tmdb/trending/:mediaType/:timeWindow", async (req: Request, res: Response) => {
    try {
      const { mediaType, timeWindow } = req.params;
      const page = (req.query.page as string) || "1";
      const data = await tmdbFetch(`/trending/${mediaType}/${timeWindow}`, { page });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Multi-search: returns both movies and TV shows matching the query.
   * Filters out 'person' results (actors/directors) so only content is returned.
   *
   * GET /api/tmdb/search/multi
   *   ?query  — search string (required; returns empty results if missing)
   *   ?page   — pagination (default: 1)
   */
  app.get("/api/tmdb/search/multi", async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string;
      const page = (req.query.page as string) || "1";

      // Return empty instead of erroring on a missing query param
      if (!query) return res.json({ results: [], total_results: 0 });

      const data = await tmdbFetch("/search/multi", { query, page });

      // Strip out person results — we only want movies and TV shows
      data.results = data.results.filter(
        (r: any) => r.media_type === "movie" || r.media_type === "tv"
      );
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Genre / provider discovery — passes query params directly to TMDB discover API.
   *
   * GET /api/tmdb/discover/:mediaType
   *   mediaType            — 'movie' | 'tv'
   *   ?with_genres         — comma-separated genre IDs
   *   ?sort_by             — e.g. "popularity.desc"
   *   ?page
   *   ?with_watch_providers — pipe-separated provider IDs (e.g. "8|9")
   *   ?watch_region        — ISO country code (e.g. "US")
   */
  app.get("/api/tmdb/discover/:mediaType", async (req: Request, res: Response) => {
    try {
      const { mediaType } = req.params;
      const params: Record<string, string> = {};
      if (req.query.with_genres) params.with_genres = req.query.with_genres as string;
      if (req.query.sort_by) params.sort_by = req.query.sort_by as string;
      if (req.query.page) params.page = req.query.page as string;
      if (req.query.with_watch_providers) params.with_watch_providers = req.query.with_watch_providers as string;
      if (req.query.watch_region) params.watch_region = req.query.watch_region as string;
      const data = await tmdbFetch(`/discover/${mediaType}`, params);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Returns the combined Top 10 for a given streaming provider (e.g. Netflix).
   * Fetches movies and TV shows in parallel, sorts by popularity, and returns
   * the top 10 across both types. Results are cached for CACHE_TTL.
   *
   * GET /api/tmdb/provider/:providerId/top
   *   providerId  — TMDB watch provider ID (Netflix=8, Disney+=337, etc.)
   *   ?region     — ISO country code for availability (default: 'US')
   */
  app.get("/api/tmdb/provider/:providerId/top", async (req: Request, res: Response) => {
    try {
      const { providerId } = req.params;
      const region = (req.query.region as string) || "US";
      const cacheKey = `provider_top_${providerId}_${region}`;

      // Return from cache if available — avoids two TMDB calls per request
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Normalise values in case arrays sneak in (shouldn't happen in practice)
      const pid = Array.isArray(providerId) ? providerId[0] : providerId;
      const reg = Array.isArray(region) ? region[0] : region;

      // Fetch top movies and TV shows for this provider simultaneously
      const [movies, tvShows] = await Promise.all([
        tmdbFetch("/discover/movie", {
          with_watch_providers: pid,
          watch_region: reg,
          sort_by: "popularity.desc",
          page: "1",
        }),
        tmdbFetch("/discover/tv", {
          with_watch_providers: pid,
          watch_region: reg,
          sort_by: "popularity.desc",
          page: "1",
        }),
      ]);

      // Tag each result with its media_type (TMDB discover doesn't include it)
      const movieResults = (movies.results || []).slice(0, 10).map((r: any) => ({
        ...r,
        media_type: "movie",
      }));
      const tvResults = (tvShows.results || []).slice(0, 10).map((r: any) => ({
        ...r,
        media_type: "tv",
      }));

      // Merge, sort by popularity descending, take top 10
      const combined = [...movieResults, ...tvResults]
        .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 10);

      const result = { results: combined, provider_id: providerId, region };
      setCache(cacheKey, result);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Movies currently showing in cinemas.
   * NOTE: This endpoint exists on the server but is no longer called from the
   * frontend — the "In Theaters" home section was removed. Kept in case it
   * is re-added in a future release.
   *
   * GET /api/tmdb/movie/now_playing
   *   ?region — ISO country code (falls back to global if no results for region)
   */
  app.get("/api/tmdb/movie/now_playing", async (req: Request, res: Response) => {
    try {
      const region = (req.query.region as string) || "";
      const cacheKey = `now_playing_${region}`;

      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const params: Record<string, string> = { page: "1" };
      if (region) params.region = region;

      let data = await tmdbFetch("/movie/now_playing", params);

      // Fall back to global results if the region returned nothing
      if (region && (!data.results || data.results.length === 0)) {
        data = await tmdbFetch("/movie/now_playing", { page: "1" });
      }

      const results = (data.results || []).slice(0, 10).map((r: any) => ({
        ...r,
        media_type: "movie",
      }));

      const result = { results, region: region || "global" };
      setCache(cacheKey, result);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Full movie details by TMDB ID.
   * Used by the detail screen to show runtime, overview, genres, cast, etc.
   *
   * GET /api/tmdb/movie/:id
   */
  app.get("/api/tmdb/movie/:id", async (req: Request, res: Response) => {
    try {
      const data = await tmdbFetch(`/movie/${req.params.id}`);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Full TV show details by TMDB ID.
   * Includes the seasons array needed to populate the episode progress tracker.
   *
   * GET /api/tmdb/tv/:id
   */
  app.get("/api/tmdb/tv/:id", async (req: Request, res: Response) => {
    try {
      const data = await tmdbFetch(`/tv/${req.params.id}`);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Episode list for a specific season of a TV show.
   * Used by the progress tracker screen to list episodes the user can mark off.
   *
   * GET /api/tmdb/tv/:id/season/:seasonNumber
   */
  app.get("/api/tmdb/tv/:id/season/:seasonNumber", async (req: Request, res: Response) => {
    try {
      const data = await tmdbFetch(`/tv/${req.params.id}/season/${req.params.seasonNumber}`);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * TMDB genre list for movies or TV.
   * Useful for displaying genre names when only IDs are available.
   *
   * GET /api/tmdb/genre/:mediaType/list
   *   mediaType — 'movie' | 'tv'
   */
  app.get("/api/tmdb/genre/:mediaType/list", async (req: Request, res: Response) => {
    try {
      const data = await tmdbFetch(`/genre/${req.params.mediaType}/list`);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
