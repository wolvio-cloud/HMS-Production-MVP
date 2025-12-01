.PHONY: help start stop restart logs clean install migrate seed

help: ## Show this help message
	@echo '🏥 HMS Production MVP - Commands'
	@echo ''
	@echo 'Usage:'
	@echo '  make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Docker Commands
start: ## Start all services (PostgreSQL + Redis + Backend + Frontend)
	docker-compose up -d
	@echo '✅ All services started!'
	@echo '   Backend:  http://localhost:3001'
	@echo '   Frontend: http://localhost:3000'
	@echo '   Postgres: localhost:5432'
	@echo '   Redis:    localhost:6379'

stop: ## Stop all services
	docker-compose down
	@echo '✅ All services stopped'

restart: stop start ## Restart all services

logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs only
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs only
	docker-compose logs -f frontend

clean: ## Stop services and remove volumes (⚠️  deletes data)
	docker-compose down -v
	@echo '⚠️  All data removed!'

# Database Commands
db-start: ## Start only PostgreSQL and Redis
	docker-compose up -d postgres redis
	@echo '✅ Database services started'
	@echo '   Postgres: localhost:5432'
	@echo '   Redis:    localhost:6379'

db-stop: ## Stop database services
	docker-compose stop postgres redis

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U hms_user -d hms_db

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

# Backend Commands
install: ## Install backend dependencies
	cd backend && npm install
	@echo '✅ Backend dependencies installed'

migrate: ## Run database migrations
	cd backend && npm run prisma:migrate
	@echo '✅ Migrations applied'

seed: ## Seed database with sample data
	cd backend && npm run prisma:seed
	@echo '✅ Database seeded with sample data'

generate: ## Generate Prisma client
	cd backend && npm run prisma:generate
	@echo '✅ Prisma client generated'

studio: ## Open Prisma Studio (database GUI)
	cd backend && npm run prisma:studio

reset: ## Reset database and reseed
	cd backend && npm run db:reset
	@echo '✅ Database reset and reseeded'

# Development Commands
dev-backend: ## Run backend in development mode (without Docker)
	cd backend && npm run start:dev

dev-frontend: ## Run frontend in development mode (without Docker)
	cd frontend && npm run dev

# Setup Commands
setup: ## Complete initial setup (install + migrate + seed)
	@echo '📦 Installing backend dependencies...'
	cd backend && npm install
	@echo '🗄️  Setting up database...'
	cd backend && cp .env.example .env
	cd backend && npm run prisma:generate
	cd backend && npm run prisma:migrate
	cd backend && npm run prisma:seed
	@echo '✅ Setup complete!'
	@echo ''
	@echo 'Next steps:'
	@echo '  1. make start      # Start all services'
	@echo '  2. Open http://localhost:3000'
	@echo '  3. Login with: dr.kumar / demo'

# Quick Setup (Docker)
docker-setup: ## Setup and start everything with Docker
	docker-compose up -d
	@echo '✅ Docker setup complete!'
	@echo '   Waiting for services to be ready...'
	sleep 10
	@echo ''
	@echo '🎉 HMS Production MVP is running!'
	@echo '   Frontend: http://localhost:3000'
	@echo '   Backend:  http://localhost:3001'
	@echo ''
	@echo 'Login credentials (all password: demo):'
	@echo '   General:  dr.kumar, dr.priya'
	@echo '   Ortho:    dr.sharma'
	@echo '   Gyno:     dr.meera'

# Status
status: ## Check status of all services
	@echo '🏥 HMS Production MVP - Service Status'
	@echo ''
	docker-compose ps
