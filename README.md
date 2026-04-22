# NextUp

A mobile entertainment companion app built with Expo (React Native). NextUp helps you organise movies and TV series, track episode progress, decide what to watch, and coordinate viewing with friends.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Design System](#design-system)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Storage & Auth](#storage--auth)
- [Navigation](#navigation)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Known Limitations](#known-limitations)

---

## Overview

NextUp is a local-first mobile app. All user data (watchlists, episode progress, friends, profile) lives on-device in AsyncStorage. The only network dependency is the TMDB API, which is accessed through a server-side Express proxy to keep the API key secret.

---

## Features

| Feature | Description |
|---|---|
| **Content Discovery** | Browse Top 10 lists per streaming provider (Netflix, Disney+, Prime Video, Apple TV+, Paramount+). Filter by provider using chip tabs. |
| **Search** | Unified movie + TV search powered by TMDB multi-search. |
| **Watchlists** | Three-status system: Want / Watching / Watched. Add from any card with one tap. |
| **Episode Progress** | Track which season and episode you are up to for any TV show. |
| **Continue Watching** | Home screen shows a row of items currently marked as Watching. |
| **Random Picker** | Spin wheel that randomly selects a title from your Want list. |
| **Swipe Decisions** | Tinder-style swipe interface to add or skip titles. |
| **Watch Together** | Coordinate with friends — pick a title everyone on your shared Want list agrees on. |
| **Friends via QR** | Each user has a unique QR code. Friends scan each other's codes to connect. |
| **Multi-user** | Multiple accounts can exist on the same device; data is scoped per email. |
| **Onboarding** | First-time setup flow for selecting favourite genres and preferences. |

---

## Tech Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| Expo | ~54.0 | Core mobile framework |
| React Native | 0.81 | UI primitives |
| TypeScript | — | Type safety |
| expo-router | ~6.0 | File-based navigation |
| @tanstack/react-query | ^5.83 | Server state / caching |
| @react-native-async-storage/async-storage | 2.2 | Local data persistence |
| expo-camera | — | QR code scanning |
| react-native-qrcode-svg | — | QR code generation |
| expo-haptics | ~15.0 | Tactile feedback |
| expo-linear-gradient | ~15.0 | Gradient UI elements |
| expo-image | ~3.0 | Optimised image loading |
| react-native-reanimated | ~4.1 | Animations |
| expo-blur | — | Frosted glass tab bar (iOS) |
| @expo-google-fonts/dm-sans | — | DM Sans typeface |

### Backend
| Library | Purpose |
|---|---|
| Express 5 | HTTP server / TMDB proxy |
| TypeScript + tsx | Type-safe server code |
| esbuild | Production build |

### Database (minimal use)
| Library | Purpose |
|---|---|
| Drizzle ORM + drizzle-kit | Schema definition and migrations |
| PostgreSQL + pg | Relational database (users table only) |

---

## Project Structure

```
nextup/
├── app/                          # Expo Router screens (each file = a route)
│   ├── _layout.tsx               # Root layout: providers + font loading
│   ├── +not-found.tsx            # 404 fallback screen
│   ├── +native-intent.tsx        # Deep link intent handler
│   ├── onboarding.tsx            # First-time setup flow
│   ├── edit-profile.tsx          # Edit name, avatar, genre preferences
│   ├── swipe.tsx                 # Swipe-to-decide screen
│   ├── swipe-summary.tsx         # Results after a swipe session
│   ├── random-picker.tsx         # Spin wheel random selector
│   ├── watch-together.tsx        # Friends list + Watch Together (tabbed)
│   ├── qr-scanner.tsx            # Camera-based QR code scanner
│   ├── my-qr-code.tsx            # Display user's own QR code
│   ├── (auth)/                   # Auth flow (no tab bar)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/                   # Main app with bottom tab bar
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Home screen
│   │   ├── search.tsx            # Search screen
│   │   ├── lists.tsx             # My Lists (Want / Watching / Watched)
│   │   └── settings.tsx          # Settings + profile management
│   ├── details/
│   │   └── [id].tsx              # Movie / TV detail screen (dynamic route)
│   └── progress/
│       └── [id].tsx              # Episode progress tracker (dynamic route)
│
├── components/                   # Reusable UI components
│   ├── AppBackground.tsx         # Full-screen gradient background wrapper
│   ├── AppDrawer.tsx             # Custom animated side drawer
│   ├── ErrorBoundary.tsx         # React error boundary (class component)
│   ├── ErrorFallback.tsx         # Fallback UI shown when ErrorBoundary catches
│   ├── GenreChip.tsx             # Genre tag pill component
│   ├── KeyboardAwareScrollViewCompat.tsx  # Cross-platform keyboard-aware scroll
│   ├── ListItem.tsx              # A single row in a watchlist
│   ├── MediaCard.tsx             # Poster card used in search results
│   └── SectionHeader.tsx        # Section heading with optional "See All" link
│
├── context/
│   ├── AppContext.tsx            # Global state: auth, lists, progress, friends, profile
│   └── DrawerContext.tsx        # Drawer open/close state
│
├── theme/
│   ├── colors.ts                # Theatre-inspired colour palette (single source of truth)
│   ├── typography.ts            # Font size and weight tokens
│   ├── spacing.ts               # Spacing scale
│   ├── layout.ts                # Shared layout values (border radius, etc.)
│   ├── buttons.ts               # Button style presets
│   └── gradients.ts             # Gradient definitions
│
├── types/
│   └── media.ts                 # All data types + TMDB mappers + image URL helpers
│
├── lib/
│   └── query-client.ts          # React Query client + API fetch utilities
│
├── constants/
│   └── colors.ts                # Legacy colour constants (use theme/colors.ts instead)
│
├── server/
│   ├── index.ts                 # Express app entry point
│   ├── routes.ts                # TMDB proxy API routes
│   ├── storage.ts               # In-memory storage class (MemStorage)
│   └── templates/
│       └── landing-page.html    # Static landing page served in production
│
├── shared/
│   └── schema.ts                # Drizzle ORM schema (users table)
│
├── assets/
│   └── images/                  # App icons, splash, logos
│       ├── icon.png
│       ├── logo.png
│       ├── favicon.png
│       ├── splash-icon.png
│       ├── nextup-logo.png
│       ├── nextup-logo-transparent.png
│       └── android-icon-*.png
│
├── app.json                     # Expo config (bundle ID, permissions, plugins)
├── babel.config.js              # Babel + Reanimated plugin
├── metro.config.js              # Metro bundler config
├── tsconfig.json                # TypeScript config
├── drizzle.config.ts            # Drizzle ORM config
└── package.json                 # Dependencies and npm scripts
```

---

## Architecture

### Client–Server Split

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   Expo React Native     │  HTTP   │   Express.js Server      │
│   (port 8081 / native)  │────────▶│   (port 5000)            │
│                         │         │                          │
│  AppContext (AsyncStorage│         │  /api/tmdb/* routes      │
│  React Query cache      │         │  TMDB API proxy          │
│  expo-router screens    │         │  In-memory response cache │
└─────────────────────────┘         └──────────┬───────────────┘
                                               │  HTTPS
                                               ▼
                                    ┌──────────────────────┐
                                    │   TMDB API           │
                                    │   api.themoviedb.org │
                                    └──────────────────────┘
```

### State Management

- **AppContext** — single React Context holding all user state. All mutations use functional `setState` to avoid stale-closure bugs. All methods are memoised with `useCallback`.
- **DrawerContext** — separate lightweight context for the side drawer open/close state.
- **React Query** — used for TMDB API data fetching with a 10-minute `staleTime` and manual cache invalidation on pull-to-refresh.
- **AsyncStorage** — persistent storage for all user data, scoped per email address.

---

## Design System

NextUp uses a **Theatre-Inspired** design palette. No hardcoded hex values should appear in component files — always import from `theme/colors.ts`.

| Token | Hex | Use |
|---|---|---|
| `gold` / `accent` | `#C9A24D` | Primary accent, active states, stars, headings |
| `cream` / `text` | `#E8DCC2` | All body text — replaces white |
| `black` / `background` | `#1C1C1C` | Screen backgrounds |
| `velvet` / `danger` | `#7A0F14` | Destructive actions, remove buttons |
| `surface` | `#2A2A2A` | Cards, inputs, panels |
| `textSecondary` | cream @ 70% opacity | Supporting labels |
| `textMuted` | cream @ 50% opacity | Placeholders, disabled text |

**Typography:** DM Sans (Google Fonts) — Regular (400), Medium (500), SemiBold (600), Bold (700).

**No gradients** — the design relies on flat dark surfaces with subtle gold-tinted borders.

---

## API Reference

All routes proxy to `https://api.themoviedb.org/3`. The TMDB API key is added server-side.

| Method | Route | Description |
|---|---|---|
| GET | `/api/tmdb/trending/:mediaType/:timeWindow` | Trending content (`movie`/`tv`/`all`, `day`/`week`) |
| GET | `/api/tmdb/search/multi?query=` | Multi-search (movies + TV, persons excluded) |
| GET | `/api/tmdb/discover/:mediaType` | Genre/provider-based discovery |
| GET | `/api/tmdb/provider/:providerId/top?region=US` | Top 10 for a streaming provider (cached 10 min) |
| GET | `/api/tmdb/movie/now_playing` | Currently in cinemas (unused in UI, kept for future use) |
| GET | `/api/tmdb/movie/:id` | Full movie details |
| GET | `/api/tmdb/tv/:id` | Full TV show details + seasons list |
| GET | `/api/tmdb/tv/:id/season/:seasonNumber` | Season episode list |
| GET | `/api/tmdb/genre/:mediaType/list` | Genre list for movie or TV |

**Streaming provider IDs:**

| Provider | TMDB ID |
|---|---|
| Netflix | 8 |
| Disney+ | 337 |
| Prime Video | 9 |
| Apple TV+ | 350 |
| Paramount+ | 531 |

---

## Data Models

All types are defined in `types/media.ts`.

### MediaItem
Normalised content object used throughout the app, created from TMDB raw data via `mapTmdbToMediaItem()`.
```ts
{ id, mediaType, title, posterPath, backdropPath, overview, releaseDate, voteAverage, genreIds }
```

### ListEntry
A user's watchlist record. Caches title and posterPath to avoid extra API calls when rendering lists.
```ts
{ mediaId, mediaType, status: 'want'|'watching'|'watched', addedAt, title, posterPath, voteAverage, genreIds }
```

### ProgressEntry
Tracks the last watched episode for a TV show (one record per show).
```ts
{ mediaId, seasonNumber, episodeNumber, updatedAt, isCompleted }
```

### UserProfile
Stored per account. Includes onboarding preferences and a unique UUID-like ID used for QR code friend-adding.
```ts
{ id, name, avatarUrl?, favoriteGenres, preferredMediaType?, preferredProviders?, language, region, onboarded }
```

### Friend
A friend connection stored locally. The `id` is the friend's `profile.id` UUID, obtained by scanning their QR code.
```ts
{ id, displayName, listEntries? }
```

---

## Storage & Auth

### AsyncStorage key structure

```
@nextup_auth_users              → JSON array of all accounts on this device
@nextup_current_auth            → email of the active session

@nextup_user_{email}_profile    → UserProfile
@nextup_user_{email}_lists      → ListEntry[]
@nextup_user_{email}_progress   → ProgressEntry[]
@nextup_user_{email}_friends    → Friend[]
```

### Auth flow
1. **Signup** — validates email uniqueness, creates account, initialises empty data keys, sets session.
2. **Login** — matches email + password, loads user data, sets session key.
3. **Auto-login** — on app start, reads `@nextup_current_auth` and loads data silently.
4. **Logout** — removes the session key. Data is preserved so the user can log back in.

> Passwords are stored in plain text because all data is local to the device. There is no server-side authentication.

---

## Navigation

```
Stack (root)
├── (auth)/login
├── (auth)/signup
├── onboarding
├── (tabs)                   ← Bottom tab bar
│   ├── index                Home
│   ├── search               Search
│   ├── lists                My Lists
│   └── settings             Settings
├── details/[id]             Movie or TV detail (params: id, type)
├── progress/[id]            Episode progress tracker
├── edit-profile
├── swipe
├── swipe-summary
├── random-picker
├── watch-together           Friends + Watch Together
├── qr-scanner
└── my-qr-code
```

**Custom Drawer** (not a navigation-level drawer):
`AppDrawer` is rendered at the root layout as an absolutely positioned overlay. It slides in from the left when the hamburger button in the Home header is pressed. State is managed by `DrawerContext`.

Drawer links: Swipe Decisions · Random Picker · Watch Together · My QR Code · Log Out.

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo Go app on your device (iOS or Android), or a simulator

### Setup

```bash
# Install dependencies
npm install

# Start the backend (Express API server on port 5000)
npm run server:dev

# Start the frontend (Expo bundler on port 8081)
npm run expo:dev
```

Scan the QR code in your terminal with Expo Go, or press `i`/`a` for a simulator.

### Available scripts

| Script | Description |
|---|---|
| `npm run expo:dev` | Expo dev server with hot reload |
| `npm run server:dev` | Express backend with tsx watch mode |
| `npm run expo:static:build` | Static web export |
| `npm run server:build` | Compile backend (esbuild) |
| `npm run server:prod` | Run compiled production server |
| `npm run db:push` | Push Drizzle schema to the database |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TMDB_API_KEY` | Yes | TMDB v3 API key — server-side only, never sent to the client |
| `EXPO_PUBLIC_DOMAIN` | Yes | Domain the Expo app uses to reach the Express backend |
| `SESSION_SECRET` | Yes | Express session secret |
| `DATABASE_URL` | Optional | PostgreSQL connection string (only needed if using the database) |

---

## Known Limitations

- **No cloud sync** — data lives on the device. Uninstalling the app erases all watchlists and progress.
- **Friend display names** — friends added by QR scan appear as "User XXXXXX" (first 6 chars of their UUID). There is no backend user registry to resolve real names.
- **Local-only auth** — passwords are stored in plain text on-device. Suitable for a local-first app; would need to be replaced before any cloud features are added.
- **Single device** — your watchlist is not accessible on another device or after reinstalling.
- **Provider availability** — Top 10 lists default to US availability. Content in other regions may differ.
