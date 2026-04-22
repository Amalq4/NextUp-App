/**
 * media.ts — Core data types and TMDB utility functions
 *
 * This file is the single source of truth for all media-related types.
 * It also contains:
 *   - Raw TMDB API response shapes (TmdbMovie, TmdbTvDetails, etc.)
 *   - Normalised app-internal shapes (MediaItem, ListEntry, etc.)
 *   - Conversion helpers (mapTmdbToMediaItem)
 *   - Image URL builders (getPosterUrl, getBackdropUrl)
 *   - The full TMDB genre list used throughout the app
 */

// ─── Media Type ───────────────────────────────────────────────────────────────

/** The two content types supported by TMDB and the app. */
export type MediaType = 'movie' | 'tv';

// ─── Normalised App Models ────────────────────────────────────────────────────

/**
 * Normalised representation of a movie or TV show used throughout the app.
 * Created from TMDB raw data via mapTmdbToMediaItem(). All components and
 * context methods work with this shape, never with raw TMDB objects directly.
 */
export interface MediaItem {
  id: number;               // TMDB content ID
  mediaType: MediaType;     // 'movie' | 'tv'
  title: string;            // Display title (unified for movie.title and tv.name)
  posterPath: string | null;    // Relative poster path — use getPosterUrl() to resolve
  backdropPath: string | null;  // Relative backdrop path — use getBackdropUrl() to resolve
  overview: string;             // Short plot description
  releaseDate: string;          // ISO date (release_date or first_air_date)
  voteAverage: number;          // Rating out of 10 from TMDB
  genreIds: number[];           // Array of TMDB genre IDs
}

/** The three states a watchlist entry can be in. */
export type ListStatus = 'want' | 'watching' | 'watched';

/**
 * A user's watchlist entry — stored in AsyncStorage under the user's email key.
 * Duplicates a subset of MediaItem fields so the list can render without
 * an extra TMDB API fetch.
 */
export interface ListEntry {
  mediaId: number;          // TMDB ID — used as the unique key
  mediaType: MediaType;
  status: ListStatus;       // Current watch status
  addedAt: string;          // ISO timestamp of when the entry was created
  notes?: string;           // Optional user note (not yet exposed in UI)
  title: string;            // Cached title to avoid re-fetching
  posterPath: string | null;
  voteAverage: number;
  genreIds: number[];
}

/**
 * Tracks a user's episode progress for a TV series.
 * One record per show — only the most recently watched episode is stored.
 */
export interface ProgressEntry {
  mediaId: number;          // TMDB TV show ID
  seasonNumber: number;     // Last watched season (1-indexed)
  episodeNumber: number;    // Last watched episode within that season (1-indexed)
  updatedAt: string;        // ISO timestamp of the last update
  isCompleted: boolean;     // True when the user marks the whole series as done
}

/**
 * The user's profile, stored per-account in AsyncStorage.
 * Created on signup with sensible defaults; updated via the onboarding flow
 * and Edit Profile screen.
 */
export interface UserProfile {
  id: string;                            // UUID-like string generated on signup
  name: string;                          // Display name
  avatarUrl?: string;                    // Optional avatar image URI
  favoriteGenres: number[];              // TMDB genre IDs selected during onboarding
  preferredMediaType?: 'movie' | 'tv' | 'both'; // Filtering preference
  preferredProviders?: number[];         // Preferred streaming services (TMDB provider IDs)
  language: string;                      // ISO 639-1 language code (default: 'en')
  region: string;                        // ISO 3166-1 country code (default: 'US')
  onboarded: boolean;                    // Whether the onboarding flow was completed
}

/**
 * A friend entry stored locally.
 * NOTE: Friends are identified by their profile.id UUID only. Because the app
 * has no backend user registry, a scanned friend's name resolves to
 * "User XXXXXX" (first 6 chars of their ID). A real name requires a server
 * lookup that is not yet implemented.
 */
export interface Friend {
  id: string;                      // The friend's profile.id (scanned from QR)
  displayName: string;             // Resolved name — may be "User XXXXXX" for QR adds
  listEntries?: ListEntry[];       // Cached list (not yet populated from a real source)
}

// ─── TMDB Raw API Shapes ──────────────────────────────────────────────────────

/**
 * Raw movie or TV item as returned by the TMDB API.
 * Both types share a common shape but differ on field names
 * (title vs name, release_date vs first_air_date).
 */
export interface TmdbMovie {
  id: number;
  title?: string;          // Present for movies
  name?: string;           // Present for TV shows
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;        // Movies
  first_air_date?: string;      // TV shows
  vote_average: number;
  genre_ids?: number[];         // Present in list endpoints
  genres?: Genre[];             // Present in detail endpoints
  media_type?: string;          // Only present in multi-search results
  number_of_seasons?: number;   // TV only
}

/** A single season summary as returned in TV detail responses. */
export interface TmdbSeason {
  season_number: number;
  episode_count: number;
  name: string;
  air_date: string | null;
}

/** Full TV show detail response from TMDB (GET /tv/:id). */
export interface TmdbTvDetails {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
  genres: Genre[];
  number_of_seasons: number;
  seasons: TmdbSeason[];
}

/** A single episode from a season detail response. */
export interface TmdbEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview: string;
  air_date: string | null;
  still_path: string | null; // Thumbnail image for the episode
}

/** Season detail response (GET /tv/:id/season/:seasonNumber). */
export interface TmdbSeasonDetails {
  id: number;
  season_number: number;
  episodes: TmdbEpisode[];
}

// ─── Genre Data ───────────────────────────────────────────────────────────────

export interface Genre {
  id: number;
  name: string;
}

/**
 * Full list of TMDB genre IDs and display names.
 * Used in onboarding (genre picker), list filtering, and card subtitles.
 * Covers both movie-only and TV-only genres so the same list works for both.
 */
export const GENRES: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
  // TV-specific genres
  { id: 10759, name: 'Action & Adventure' },
  { id: 10762, name: 'Kids' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Looks up a genre name by its TMDB ID.
 * Falls back to 'Unknown' for IDs not in the local list.
 */
export function getGenreName(id: number): string {
  return GENRES.find(g => g.id === id)?.name || 'Unknown';
}

/**
 * Builds a full TMDB image URL for a poster.
 *
 * TMDB returns relative paths like "/xyz.jpg" — they must be prefixed with
 * the CDN base URL and a size bucket.
 *
 * Common sizes: 'w92', 'w185', 'w342', 'w500', 'w780', 'original'
 *
 * @param path  - The relative poster_path from TMDB (e.g. "/abc123.jpg")
 * @param size  - The desired image width bucket (default: 'w342')
 * @returns Full image URL, or null if path is null/empty
 */
export function getPosterUrl(path: string | null, size: string = 'w342'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Builds a full TMDB image URL for a backdrop (wide banner image).
 *
 * @param path  - The relative backdrop_path from TMDB
 * @param size  - The desired image width bucket (default: 'w780')
 * @returns Full image URL, or null if path is null/empty
 */
export function getBackdropUrl(path: string | null, size: string = 'w780'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Converts a raw TMDB movie/TV response object into the app's normalised
 * MediaItem shape. Handles the differences between movie and TV field names
 * (title vs name, release_date vs first_air_date, genre_ids vs genres).
 *
 * @param item       - Raw TMDB response object
 * @param forceType  - Override the media type detection (useful when TMDB
 *                     doesn't include media_type in the response, e.g.
 *                     in discover endpoints).
 */
export function mapTmdbToMediaItem(item: TmdbMovie, forceType?: MediaType): MediaItem {
  // Determine type from: explicit override → TMDB media_type field → field presence heuristic
  const mediaType: MediaType =
    forceType ||
    (item.media_type as MediaType) ||
    (item.title ? 'movie' : 'tv');

  return {
    id: item.id,
    mediaType,
    title: item.title || item.name || 'Unknown',     // Unify movie/TV title fields
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    overview: item.overview,
    releaseDate: item.release_date || item.first_air_date || '',
    voteAverage: item.vote_average,
    // genre_ids is present in list responses; genres[] is present in detail responses
    genreIds: item.genre_ids || item.genres?.map(g => g.id) || [],
  };
}
