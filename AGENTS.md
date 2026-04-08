# Agents

## Project Overview

Guess Your Song — a Hitster-style music guessing game. Yarn 4 monorepo with three packages: `shared` (types), `server` (Fastify API), `web` (React SPA).

## Tech Stack

- **Language**: TypeScript (strict), ES2022 target
- **Backend**: Fastify 5, Mongoose/MongoDB, JWT auth, multipart uploads
- **Frontend**: React 19, Vite, Ant Design, React Router 7
- **Testing**: Vitest, mongodb-memory-server (server), Testing Library + msw (web)
- **Linting/Formatting**: Biome (spaces, double quotes)
- **Package Manager**: Yarn 4 (Corepack)

## Commands

| Command           | Description                     |
| ----------------- | ------------------------------- |
| `yarn dev`        | Start all packages in dev mode  |
| `yarn test`       | Run all tests across workspaces |
| `yarn test:watch` | Watch mode                      |
| `yarn lint`       | Biome check                     |
| `yarn lint:fix`   | Biome auto-fix                  |
| `yarn typecheck`  | TypeScript check all packages   |

## Conventions

- All packages use ESM (`"type": "module"`)
- Shared types live in `packages/shared/src/types/`
- Server tests use in-memory MongoDB (`mongodb-memory-server`)
- Web tests use MSW for API mocking (`packages/web/src/test/handlers.ts`)
- Indent with spaces (width 4), double quotes (enforced by Biome)
- Test files are co-located: `foo.ts` → `foo.test.ts`
