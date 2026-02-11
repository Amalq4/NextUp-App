import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY || "";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.get("/api/tmdb/search/multi", async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string;
      const page = (req.query.page as string) || "1";
      if (!query) return res.json({ results: [], total_results: 0 });
      const data = await tmdbFetch("/search/multi", { query, page });
      data.results = data.results.filter(
        (r: any) => r.media_type === "movie" || r.media_type === "tv"
      );
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

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

  app.get("/api/tmdb/provider/:providerId/top", async (req: Request, res: Response) => {
    try {
      const { providerId } = req.params;
      const region = (req.query.region as string) || "US";
      const cacheKey = `provider_top_${providerId}_${region}`;

      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const pid = Array.isArray(providerId) ? providerId[0] : providerId;
      const reg = Array.isArray(region) ? region[0] : region;

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

      const movieResults = (movies.results || []).slice(0, 10).map((r: any) => ({
        ...r,
        media_type: "movie",
      }));
      const tvResults = (tvShows.results || []).slice(0, 10).map((r: any) => ({
        ...r,
        media_type: "tv",
      }));

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

  app.get("/api/tmdb/movie/:id", async (req: Request, res: Response) => {
    try {
      const data = await tmdbFetch(`/movie/${req.params.id}`);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tmdb/tv/:id", async (req: Request, res: Response) => {
    try {
      const data = await tmdbFetch(`/tv/${req.params.id}`);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tmdb/tv/:id/season/:seasonNumber", async (req: Request, res: Response) => {
    try {
      const data = await tmdbFetch(`/tv/${req.params.id}/season/${req.params.seasonNumber}`);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

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
