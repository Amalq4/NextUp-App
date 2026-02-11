export type MediaType = 'movie' | 'tv';

export interface MediaItem {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
}

export type ListStatus = 'want' | 'watching' | 'watched';

export interface ListEntry {
  mediaId: number;
  mediaType: MediaType;
  status: ListStatus;
  addedAt: string;
  notes?: string;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  genreIds: number[];
}

export interface ProgressEntry {
  mediaId: number;
  seasonNumber: number;
  episodeNumber: number;
  updatedAt: string;
  isCompleted: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  favoriteGenres: number[];
  preferredMediaType?: 'movie' | 'tv' | 'both';
  preferredProviders?: number[];
  language: string;
  region: string;
  onboarded: boolean;
}

export interface Friend {
  id: string;
  displayName: string;
  listEntries?: ListEntry[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
  genres?: Genre[];
  media_type?: string;
  number_of_seasons?: number;
}

export interface TmdbSeason {
  season_number: number;
  episode_count: number;
  name: string;
  air_date: string | null;
}

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

export interface TmdbEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview: string;
  air_date: string | null;
  still_path: string | null;
}

export interface TmdbSeasonDetails {
  id: number;
  season_number: number;
  episodes: TmdbEpisode[];
}

export function mapTmdbToMediaItem(item: TmdbMovie, forceType?: MediaType): MediaItem {
  const mediaType: MediaType = forceType || (item.media_type as MediaType) || (item.title ? 'movie' : 'tv');
  return {
    id: item.id,
    mediaType,
    title: item.title || item.name || 'Unknown',
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    overview: item.overview,
    releaseDate: item.release_date || item.first_air_date || '',
    voteAverage: item.vote_average,
    genreIds: item.genre_ids || item.genres?.map(g => g.id) || [],
  };
}

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
  { id: 10759, name: 'Action & Adventure' },
  { id: 10762, name: 'Kids' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
];

export function getGenreName(id: number): string {
  return GENRES.find(g => g.id === id)?.name || 'Unknown';
}

export function getPosterUrl(path: string | null, size: string = 'w342'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: string = 'w780'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
