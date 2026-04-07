# Guess Your Song

A Hitster-style music guessing game where players hear songs and place them on a personal timeline in chronological order. Correct placement keeps the card and scores a point.

## Tech Stack

- **Backend**: Fastify + TypeScript + MongoDB (Mongoose)
- **Frontend**: React + Vite + Ant Design
- **Testing**: Vitest (62 tests, strict TDD)
- **Monorepo**: Yarn workspaces

## Quick Start

### Prerequisites

- Node.js >= 20
- Yarn 4.x (`corepack enable`)
- MongoDB running locally (or use Docker)

### Development

```bash
# Install dependencies
yarn install

# Start MongoDB, server, and web dev server
yarn dev
```

- Web: http://localhost:5173
- API: http://localhost:3000
- Admin panel: http://localhost:5173/admin

### Testing

```bash
yarn test          # Run all 62 tests
yarn test:watch    # Watch mode
```

### Docker

```bash
docker compose up --build
```

App available at http://localhost:3000.

## Project Structure

```
packages/
  shared/     # Shared TypeScript types
  server/     # Fastify API (auth, songs, playlists, game sessions)
  web/        # React SPA (admin panel + game UI)
```

## Game Flow

1. Admin creates songs, organizes them into playlists
2. Admin creates a game session from a playlist → gets a 6-character join code
3. Players open the game URL, enter the code and their name to join
4. Each round: a song plays, players place it on their timeline
5. Correct chronological placement = keep the card + score a point
6. After all rounds: final results and scores

## Environment Variables

See [.env.example](.env.example) for configuration options.
