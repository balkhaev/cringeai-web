# Trender - Docker Commands
# Usage: make <target>

.PHONY: help dev prod up down build logs clean db-migrate db-push db-studio infra

# Default target
help:
	@echo "Trender Docker Commands:"
	@echo ""
	@echo "  make dev        - Start development (hot reload)"
	@echo "  make prod       - Start production"
	@echo "  make infra      - Start only infrastructure (postgres, redis, minio)"
	@echo ""
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make build      - Build all images"
	@echo "  make logs       - View logs (follow mode)"
	@echo "  make clean      - Remove containers and volumes"
	@echo ""
	@echo "  make db-migrate - Run Prisma migrations"
	@echo "  make db-push    - Push Prisma schema to DB"
	@echo "  make db-studio  - Open Prisma Studio"
	@echo ""
	@echo "Services: server, web, video-frames, scrapper"
	@echo "  make logs-server    - View server logs"
	@echo "  make logs-web       - View web logs"
	@echo "  make restart-server - Restart server"

# ============================================
# Main Commands
# ============================================

# Development with hot reload
dev:
	docker compose up --build

# Production (no override file)
prod:
	docker compose -f docker-compose.yml up --build -d

# Start only infrastructure (for local development without Docker apps)
infra:
	docker compose up postgres redis minio minio-init -d

# Start all services
up:
	docker compose up -d

# Stop all services
down:
	docker compose down

# Build all images
build:
	docker compose build

# View logs (all services)
logs:
	docker compose logs -f

# Remove everything including volumes
clean:
	docker compose down -v --remove-orphans

# ============================================
# Database Commands
# ============================================

db-migrate:
	docker compose exec server npx prisma migrate deploy

db-push:
	docker compose exec server npx prisma db push

db-studio:
	@echo "Starting Prisma Studio on http://localhost:5555"
	cd packages/db && npx prisma studio

# ============================================
# Service-specific Commands
# ============================================

logs-server:
	docker compose logs -f server

logs-web:
	docker compose logs -f web

logs-video-frames:
	docker compose logs -f video-frames

logs-scrapper:
	docker compose logs -f scrapper

restart-server:
	docker compose restart server

restart-web:
	docker compose restart web

restart-video-frames:
	docker compose restart video-frames

# ============================================
# Build Individual Services
# ============================================

build-server:
	docker compose build server

build-web:
	docker compose build web

build-video-frames:
	docker compose build video-frames

build-scrapper:
	docker compose build scrapper

# ============================================
# Shell Access
# ============================================

shell-server:
	docker compose exec server sh

shell-video-frames:
	docker compose exec video-frames sh

shell-postgres:
	docker compose exec postgres psql -U postgres -d trender
