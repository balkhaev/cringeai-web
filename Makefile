# Trender - Development & Docker Commands
# Usage: make <target>

.PHONY: help install dev build clean
.PHONY: infra infra-down db-push db-migrate db-studio db-reset
.PHONY: docker docker-prod docker-down docker-logs docker-clean docker-build
.PHONY: setup setup-python

# Default target
help:
	@echo "Trender Commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make dev        - Install deps + start infra + run all services"
	@echo "    make install    - Install all dependencies"
	@echo "    make build      - Build all packages"
	@echo ""
	@echo "  Infrastructure:"
	@echo "    make infra      - Start postgres, redis, minio"
	@echo "    make infra-down - Stop infrastructure"
	@echo ""
	@echo "  Database:"
	@echo "    make db-push    - Push Prisma schema to DB"
	@echo "    make db-migrate - Run Prisma migrations"
	@echo "    make db-studio  - Open Prisma Studio"
	@echo "    make db-reset   - Reset database"
	@echo ""
	@echo "  Docker (full stack):"
	@echo "    make docker       - Start all in Docker (dev mode)"
	@echo "    make docker-prod  - Start all in Docker (production)"
	@echo "    make docker-down  - Stop Docker containers"
	@echo "    make docker-logs  - View Docker logs"
	@echo "    make docker-clean - Remove containers and volumes"
	@echo ""
	@echo "  Setup:"
	@echo "    make setup        - Full setup (deps + db + python)"
	@echo "    make setup-python - Setup Python services"

# ============================================
# Development (Local)
# ============================================

# Install all dependencies
install:
	@echo "Installing dependencies..."
	bun install

# Full development: install deps, start infra, run services
dev: install infra
	@echo "Starting development servers..."
	@sleep 2
	bun dev

# Build all packages
build:
	bun run build

# Clean build artifacts
clean:
	rm -rf node_modules/.cache
	rm -rf apps/*/.next
	rm -rf apps/*/dist
	rm -rf packages/*/dist

# ============================================
# Infrastructure (Docker containers for DB/Redis/MinIO)
# ============================================

# Start only infrastructure
infra:
	@echo "Starting infrastructure (postgres, redis, minio)..."
	docker compose up postgres redis minio minio-init -d
	@echo "Waiting for services to be ready..."
	@sleep 3
	@echo "Infrastructure ready!"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Redis: localhost:6379"
	@echo "  - MinIO: localhost:9000 (console: localhost:9001)"

# Stop infrastructure
infra-down:
	docker compose down

# ============================================
# Database Commands
# ============================================

db-push:
	bun run db:push

db-migrate:
	bun run db:migrate

db-studio:
	bun run db:studio

db-generate:
	bun run db:generate

db-reset:
	bun run db:reset

# ============================================
# Docker (Full Stack)
# ============================================

# Start all services in Docker (development mode with hot reload)
docker:
	docker compose up --build

# Start all services in Docker (production mode, detached)
docker-prod:
	docker compose -f docker-compose.yml up --build -d

# Stop all Docker containers
docker-down:
	docker compose down

# View Docker logs
docker-logs:
	docker compose logs -f

# Build all Docker images
docker-build:
	docker compose build

# Remove everything including volumes
docker-clean:
	docker compose down -v --remove-orphans

# ============================================
# Setup Commands
# ============================================

# Full setup for new developers
setup: install setup-python infra
	@echo "Running database setup..."
	@sleep 3
	bun run db:push
	@echo ""
	@echo "Setup complete! Run 'make dev' to start development."

# Setup Python virtual environments
setup-python:
	@echo "Setting up Python services..."
	@if [ -d "apps/video-frames" ]; then \
		cd apps/video-frames && \
		python3 -m venv venv && \
		./venv/bin/pip install -r requirements.txt; \
	fi
	@if [ -d "apps/scrapper" ]; then \
		cd apps/scrapper && \
		python3 -m venv venv && \
		./venv/bin/pip install -r requirements.txt; \
	fi
	@echo "Python services ready!"

# ============================================
# Individual Service Commands
# ============================================

dev-server:
	bun run dev:server

dev-web:
	bun run dev:web

dev-video-frames:
	bun run dev:video-frames

dev-scrapper:
	bun run dev:scrapper

# ============================================
# Logs (Docker)
# ============================================

logs-server:
	docker compose logs -f server

logs-web:
	docker compose logs -f web

logs-video-frames:
	docker compose logs -f video-frames

logs-scrapper:
	docker compose logs -f scrapper

# ============================================
# Shell Access (Docker)
# ============================================

shell-postgres:
	docker compose exec postgres psql -U postgres -d trender
