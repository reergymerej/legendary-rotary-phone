.PHONY: help install dev test build clean docker-up docker-down lint lint-fix

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Start development server
	npm run dev

test-unit: ## Run unit tests
	npm test

test: db-migrate-test ## Run all tests (unit + integration)
	npm run test:all

test-coverage: db-migrate-test ## Run all tests with coverage report
	npm run test:all -- --coverage

test-integration: db-migrate-test ## Run integration tests
	npm run test:integration

lint: ## Run linter
	npm run lint

lint-fix: ## Run linter with auto-fix
	npm run lint:fix

build: ## Build the project
	npm run build

clean: ## Clean build artifacts
	rm -rf dist/ coverage/

docker-up: ## Start database containers
	docker compose up -d

docker-down: ## Stop database containers
	docker compose down

db-migrate: ## Run database migrations
	npm run db:migrate

db-migrate-test: ## Run database migrations for test database
	npm run db:migrate:test

db-studio: ## Open Prisma Studio
	npm run db:studio

setup: install docker-up db-migrate ## Full development setup

reset-db: ## Reset database (dangerous!)
	docker compose down -v
	docker compose up -d
	sleep 5
	npm run db:migrate