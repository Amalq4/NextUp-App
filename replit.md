# NextUp - Replit Agent Guide

## Overview

NextUp is a mobile entertainment companion app built with Expo (React Native) that helps users organize movies and TV series, track episode progress, and decide what to watch. It integrates with TMDB (The Movie Database) API for media data and uses a local-first storage approach with AsyncStorage for user data persistence.

The app features watchlist management (want/watching/watched), TV episode progress tracking, a random picker for deciding what to watch, a "watch together" feature for friend groups, and a discovery/search interface powered by TMDB.

The project has two main parts: an Expo React Native frontend and an Express.js backend server that acts as a proxy/gateway to the TMDB API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, TypeScript
- **Navigation**: expo-router (file-based routing) with Stack and Tab navigators
  - `(auth)/` - Authentication flow (login, signup)
  - `(tabs)/` - Main app tabs (Home, Search, Lists, Friends, Settings)
  - `details/[id]` - Media detail pages
  - `progress/[id]` - Episode progress tracker
  - `onboarding` - First-time user setup
  - `random-picker` and `watch-together` - Feature screens
- **State Management**: React Context (`AppContext`) for global app state including profile, lists, progress, friends, and auth state
- **Data Persistence**: AsyncStorage for all user data (profile, watchlists, progress, friends, auth)
- **Styling**: StyleSheet with a centralized theme system under `theme/` directory. All colors are defined in `theme/colors.ts` and imported as `Colors` across all screens and components. The design palette uses: Space Cadet (#25344F - primary bg), Slate Gray (#617891 - muted text/icons), Tan (#D5B893 - accent/secondary), Coffee (#6F4D38 - button gradient start), Caput Mortuum (#632024 - button gradient end/danger). No hardcoded colors should be used in screens.
- **Fonts**: DM Sans (Google Fonts) loaded via expo-font
- **UI Libraries**: expo-image, expo-linear-gradient, expo-haptics, react-native-reanimated, expo-blur, expo-glass-effect
- **Data Fetching**: @tanstack/react-query is set up with a query client, but most data fetching currently uses plain fetch calls to the Express backend

### Backend (Express.js Server)

- **Purpose**: Acts as a TMDB API proxy to keep the API key server-side and handle CORS
- **Runtime**: Node.js with TypeScript (tsx for dev, esbuild for production)
- **Routes** (in `server/routes.ts`): All prefixed with `/api/tmdb/`
  - `GET /api/tmdb/trending/:mediaType/:timeWindow` - Trending content
  - `GET /api/tmdb/search/multi` - Multi-search (movies + TV)
  - `GET /api/tmdb/discover/:mediaType` - Genre-based discovery
  - `GET /api/tmdb/:type/:id` - Movie/TV details
  - `GET /api/tmdb/tv/:id/season/:seasonNumber` - Season episode details
- **CORS**: Configured to allow Replit domains and localhost origins
- **Static serving**: In production, serves a landing page for non-API routes

### Database Schema (Drizzle + PostgreSQL)

- **Location**: `shared/schema.ts`
- **Current schema**: A simple `users` table with id (UUID), username, and password
- **ORM**: Drizzle ORM with PostgreSQL dialect, configured via `drizzle.config.ts`
- **Note**: The database schema is minimal. Most user data is stored client-side in AsyncStorage. The Postgres database and Drizzle are set up but not heavily utilized yet — the `MemStorage` class in `server/storage.ts` is currently used as an in-memory store.

### Authentication

- **Approach**: Local authentication stored in AsyncStorage (no real backend auth)
- **Flow**: Users sign up or log in with email/password stored locally on-device
- **Auth screens**: `(auth)/login.tsx` and `(auth)/signup.tsx`
- **Context**: `AppContext` manages `isAuthenticated`, `authUser`, `login()`, `signup()`, `logout()` methods

### Key Data Models (in `types/media.ts`)

- `MediaItem` - Normalized TMDB media data
- `ListEntry` - User's watchlist item with status (want/watching/watched)
- `ProgressEntry` - TV episode tracking (season, episode numbers)
- `UserProfile` - User preferences and favorite genres
- `Friend` - Simple friend model for social features

### Build & Development

- **Dev**: Two processes needed — `expo:dev` for the Expo bundler and `server:dev` for the Express API
- **Production**: `expo:static:build` for static web export, `server:build` + `server:prod` for the API server
- **Database**: `db:push` uses drizzle-kit to push schema to PostgreSQL

## External Dependencies

### TMDB API
- **Purpose**: All movie/TV data (trending, search, details, seasons, episodes)
- **Base URL**: `https://api.themoviedb.org/3`
- **Auth**: API key stored in `TMDB_API_KEY` environment variable, used server-side only
- **Proxy**: All TMDB requests go through the Express backend to keep the key secret

### PostgreSQL Database
- **Connection**: Via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Usage**: Currently minimal (users table). Most data lives in AsyncStorage on the client.

### Key npm Dependencies
- `expo` (~54.0) - Core mobile framework
- `expo-router` (~6.0) - File-based navigation
- `@tanstack/react-query` (^5.83) - Server state management
- `drizzle-orm` (^0.39) + `drizzle-zod` - Database ORM and validation
- `express` (^5.0) - Backend API server
- `pg` (^8.16) - PostgreSQL client
- `@react-native-async-storage/async-storage` (2.2) - Local storage
- `react-native-reanimated` (~4.1) - Animations
- `expo-image` (~3.0) - Optimized image loading
- `expo-haptics` (~15.0) - Haptic feedback
- `expo-linear-gradient` (~15.0) - Gradient backgrounds