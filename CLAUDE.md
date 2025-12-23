# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun run dev              # Start all apps (web + server)
bun run dev:web          # Start Next.js frontend (port 3001)
bun run dev:server       # Start Hono backend (port 3000)
bun run dev:scrapper     # Start Python scrapper
bun run dev:video-frames # Start Python video-frames service

# Python services setup (required once)
bun run setup:scrapper
bun run setup:video-frames

# Database
bun run db:push          # Push schema changes to database
bun run db:generate      # Regenerate Prisma client
bun run db:migrate       # Run migrations
bun run db:studio        # Open Prisma Studio UI
bun run db:start         # Start PostgreSQL container
bun run db:stop          # Stop PostgreSQL container

# Code quality
bun run check            # Run Biome linting/formatting
bun run check-types      # TypeScript type checking
```

## Architecture

**Monorepo** using Turborepo with Bun as package manager.

### Apps
- `apps/web` - Next.js 16 frontend (React 19, TailwindCSS, shadcn/ui)
- `apps/server` - Hono backend API with BullMQ queues
- `apps/scrapper` - Python Instagram scraping service
- `apps/video-frames` - Python video processing service
- `apps/playwright` - Bun service for browser automation via Playwright

### Packages
- `@trender/db` - Prisma ORM with multi-file schema (`packages/db/prisma/schema/`)
- `@trender/auth` - Better-Auth configuration
- `@trender/config` - Shared TypeScript config

### Server structure (`apps/server/src/`)
- `routes/` - Hono API routes
- `services/` - Business logic:
  - `queues/` - BullMQ queue implementations (pipeline, video-gen, scrape)
  - `jobs/` - Job processing with unified job service
  - `instagram/` - Instagram metadata extraction, credentials
  - `video/` - Video downloading and loading
  - `analysis/` - AI-powered video analysis
  - `base/` - AI service abstractions
- `config/` - Environment configuration
- `schemas/` - OpenAPI schemas

### Key integrations
- **AI**: OpenAI + Google Gemini for content analysis
- **Storage**: S3-compatible storage
- **Queue**: Redis + BullMQ for background jobs
- **Video**: Kling AI for video generation

## Database Migrations

Schema files located in `packages/db/prisma/schema/` (multi-file schema).

**Workflow for schema changes:**
1. Edit schema files in `packages/db/prisma/schema/*.prisma`
2. Run `bun run db:migrate` to create migration and apply it
3. Migration will auto-generate Prisma client

**Commands:**
- `bun run db:migrate` - Create new migration from schema diff and apply
- `bun run db:push` - Push schema directly without migration (dev only, loses data)
- `bun run db:generate` - Regenerate client without migration
- `bun run db:reset` - Reset database and reapply all migrations

**Important:**
- Always use `db:migrate` for production-ready changes
- Use `db:push` only for rapid prototyping (doesn't create migration files)
- After pulling new code with migrations, run `db:migrate` to apply them

## Code Standards

Uses Ultracite (Biome preset) for linting/formatting. Run `bun run check` before committing.

Key conventions:
- Arrow functions for callbacks
- `for...of` over `.forEach()`
- `async/await` over promise chains
- Function components in React
- Semantic HTML with ARIA attributes
