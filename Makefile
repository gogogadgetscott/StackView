.PHONY: help build build-backend build-frontend run run-backend run-frontend run-docker \
	test test-backend test-frontend lint lint-backend lint-frontend fmt fmt-backend fmt-frontend \
	debug debug-backend debug-frontend clean clean-backend clean-frontend docker-build docker-up docker-down \
	docker-logs install dev

# Variables
BACKEND_DIR := backend
FRONTEND_DIR := frontend
DOCKER_COMPOSE := docker-compose.yml
DOCKER_COMPOSE_DEBUG := docker-compose.debug.yml

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# ============================================================================
# HELP
# ============================================================================
help: ## Display this help screen
	@echo "$(BLUE)╔════════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║           StackView - Build, Test, Run & Debug Helper              ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)BUILD TARGETS:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E 'build|Build' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)RUN TARGETS:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E 'run|Run' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)TEST TARGETS:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E 'test|Test' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)DEBUG TARGETS:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E 'debug|Debug' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)DOCKER TARGETS:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E 'docker|Docker' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)CLEANUP TARGETS:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E 'clean|Clean' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)UTILITY TARGETS:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E 'fmt|lint|install|dev' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================================================
# BUILD TARGETS
# ============================================================================
build: build-backend build-frontend ## Build both backend and frontend

build-backend: ## Build Go backend binary
	@echo "$(BLUE)Building backend...$(NC)"
	@cd $(BACKEND_DIR) && CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o ../bin/stackview-server ./cmd/server
	@echo "$(GREEN)✓ Backend built successfully$(NC)"

build-frontend: ## Build Next.js frontend
	@echo "$(BLUE)Building frontend...$(NC)"
	@cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)✓ Frontend built successfully$(NC)"

# ============================================================================
# RUN TARGETS
# ============================================================================
run: run-docker ## Run entire application (default: Docker)

run-dev: run-backend run-frontend ## Run backend and frontend separately (development mode)

run-backend: ## Run Go backend server (requires Docker socket)
	@echo "$(BLUE)Starting backend server...$(NC)"
	@cd $(BACKEND_DIR) && go run ./cmd/server/main.go

run-frontend: ## Run Next.js frontend (dev server on port 3000)
	@echo "$(BLUE)Starting frontend dev server...$(NC)"
	@cd $(FRONTEND_DIR) && npm run dev

run-docker: docker-build docker-up ## Build and run using Docker Compose

run-docker-detached: docker-build ## Run Docker Compose in background
	@echo "$(BLUE)Starting services in background...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✓ Services running in background$(NC)"
	@echo "  Backend:  http://localhost:8080"
	@echo "  Frontend: http://localhost:3000"

# ============================================================================
# TEST TARGETS
# ============================================================================
test: test-backend test-frontend ## Run all tests

test-backend: ## Run Go backend tests
	@echo "$(BLUE)Running backend tests...$(NC)"
	@cd $(BACKEND_DIR) && go test -v -race -coverprofile=coverage.out ./...
	@echo "$(GREEN)✓ Backend tests completed$(NC)"

test-backend-coverage: test-backend ## Run backend tests with coverage report
	@echo "$(BLUE)Generating coverage report...$(NC)"
	@cd $(BACKEND_DIR) && go tool cover -html=coverage.out -o coverage.html
	@echo "$(GREEN)✓ Coverage report generated: coverage.html$(NC)"

test-frontend: ## Run Next.js frontend tests
	@echo "$(BLUE)Running frontend tests...$(NC)"
	@cd $(FRONTEND_DIR) && npm run test
	@echo "$(GREEN)✓ Frontend tests completed$(NC)"

test-frontend-coverage: ## Run frontend tests with coverage
	@echo "$(BLUE)Running frontend tests with coverage...$(NC)"
	@cd $(FRONTEND_DIR) && npm run test -- --coverage
	@echo "$(GREEN)✓ Frontend tests completed$(NC)"

# ============================================================================
# LINT & FORMAT TARGETS
# ============================================================================
lint: lint-backend lint-frontend ## Run all linters

lint-backend: ## Lint Go code with golangci-lint
	@echo "$(BLUE)Linting backend code...$(NC)"
	@cd $(BACKEND_DIR) && which golangci-lint >/dev/null 2>&1 && golangci-lint run ./... || echo "$(YELLOW)⚠ golangci-lint not installed, install with: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest$(NC)"

lint-frontend: ## Lint TypeScript/React code with ESLint
	@echo "$(BLUE)Linting frontend code...$(NC)"
	@cd $(FRONTEND_DIR) && npm run lint

fmt: fmt-backend fmt-frontend ## Format all code

fmt-backend: ## Format Go code
	@echo "$(BLUE)Formatting backend code...$(NC)"
	@cd $(BACKEND_DIR) && go fmt ./...
	@echo "$(GREEN)✓ Backend code formatted$(NC)"

fmt-frontend: ## Format TypeScript/React code
	@echo "$(BLUE)Formatting frontend code...$(NC)"
	@cd $(FRONTEND_DIR) && npm run format || npx prettier --write "**/*.{ts,tsx,js,jsx}"
	@echo "$(GREEN)✓ Frontend code formatted$(NC)"

# ============================================================================
# DEBUG TARGETS
# ============================================================================
debug: debug-backend debug-frontend ## Run both services with debug logging

debug-backend: ## Run backend with debug logging and verbose output
	@echo "$(BLUE)Starting backend in debug mode...$(NC)"
	@echo "$(YELLOW)⚠ Make sure Docker socket is accessible at /var/run/docker.sock$(NC)"
	@cd $(BACKEND_DIR) && STACKVIEW_DEBUG=1 go run ./cmd/server/main.go

debug-frontend: ## Run frontend with debug logging
	@echo "$(BLUE)Starting frontend in debug mode...$(NC)"
	@cd $(FRONTEND_DIR) && npm run dev -- --experimental-debug

debug-docker: ## Run Docker Compose with debug logging
	@echo "$(BLUE)Starting services in debug mode...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE_DEBUG) up

debug-backend-delve: ## Run backend with Delve debugger (port 2345)
	@echo "$(BLUE)Starting backend with Delve debugger...$(NC)"
	@echo "$(YELLOW)Debugger listening on localhost:2345$(NC)"
	@echo "$(YELLOW)Connect with: dlv connect localhost:2345$(NC)"
	@cd $(BACKEND_DIR) && which dlv >/dev/null 2>&1 && dlv debug ./cmd/server --headless --listen=:2345 --api-version=2 || echo "$(RED)✗ Delve not installed, install with: go install github.com/go-delve/delve/cmd/dlv@latest$(NC)"

# ============================================================================
# DOCKER TARGETS
# ============================================================================
docker-build: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) build
	@echo "$(GREEN)✓ Docker images built$(NC)"

docker-build-no-cache: ## Build Docker images without cache
	@echo "$(BLUE)Building Docker images (no cache)...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) build --no-cache
	@echo "$(GREEN)✓ Docker images built$(NC)"

docker-up: ## Start Docker containers
	@echo "$(BLUE)Starting Docker containers...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) up
	@echo "$(GREEN)✓ Containers started$(NC)"

docker-down: ## Stop and remove Docker containers
	@echo "$(BLUE)Stopping Docker containers...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) down
	@echo "$(GREEN)✓ Containers stopped$(NC)"

docker-logs: ## Follow Docker container logs
	@echo "$(BLUE)Following Docker logs...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) logs -f

docker-logs-backend: ## Follow backend container logs
	@echo "$(BLUE)Following backend logs...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) logs -f backend

docker-logs-frontend: ## Follow frontend container logs
	@echo "$(BLUE)Following frontend logs...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) logs -f frontend

docker-ps: ## List running Docker containers
	@docker compose -f $(DOCKER_COMPOSE) ps

docker-pull: ## Pull latest Docker images
	@echo "$(BLUE)Pulling Docker images...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) pull
	@echo "$(GREEN)✓ Docker images pulled$(NC)"

docker-restart: ## Restart Docker containers
	@echo "$(BLUE)Restarting Docker containers...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) restart
	@echo "$(GREEN)✓ Containers restarted$(NC)"

docker-shell-backend: ## Open shell in backend container
	@docker compose -f $(DOCKER_COMPOSE) exec backend sh

docker-shell-frontend: ## Open shell in frontend container
	@docker compose -f $(DOCKER_COMPOSE) exec frontend sh

# ============================================================================
# INSTALL & SETUP TARGETS
# ============================================================================
install: install-backend install-frontend ## Install all dependencies

install-backend: ## Install Go dependencies
	@echo "$(BLUE)Installing backend dependencies...$(NC)"
	@cd $(BACKEND_DIR) && go mod download && go mod verify
	@echo "$(GREEN)✓ Backend dependencies installed$(NC)"

install-frontend: ## Install frontend dependencies
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	@cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)✓ Frontend dependencies installed$(NC)"

install-tools: ## Install development tools (dlv, golangci-lint, etc.)
	@echo "$(BLUE)Installing development tools...$(NC)"
	@go install github.com/go-delve/delve/cmd/dlv@latest
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@echo "$(GREEN)✓ Development tools installed$(NC)"

tidy: ## Run go mod tidy in backend
	@echo "$(BLUE)Running go mod tidy in backend...$(NC)"
	@cd $(BACKEND_DIR) && go mod tidy
	@echo "$(GREEN)✓ go mod tidy completed$(NC)"

tidy-docker: ## Run go mod tidy in backend container
	@echo "$(BLUE)Running go mod tidy in backend container...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE_DEBUG) run --rm backend-dev go mod tidy
	@echo "$(GREEN)✓ go mod tidy completed$(NC)"

# ============================================================================
# DEVELOPMENT TARGETS
# ============================================================================
dev: ## Run full development environment (backend + frontend + Docker)
	@echo "$(BLUE)╔════════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║              Starting StackView Development Environment             ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Starting services:$(NC)"
	@echo "  - Backend server (http://localhost:8080)"
	@echo "  - Frontend dev server (http://localhost:3000)"
	@echo ""
	@echo "$(YELLOW)Stop with Ctrl+C$(NC)"
	@echo ""
	@-make run-dev

dev-docker: ## Run development environment with Docker
	@echo "$(BLUE)╔════════════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║            Starting StackView with Docker Compose                  ║$(NC)"
	@echo "$(BLUE)╚════════════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Starting services:$(NC)"
	@echo "  - Backend (http://localhost:8080)"
	@echo "  - Frontend (http://localhost:3000)"
	@echo ""
	@echo "$(YELLOW)Press Ctrl+C to stop$(NC)"
	@echo ""
	@make run-docker

# ============================================================================
# CLEANUP TARGETS
# ============================================================================
clean: clean-backend clean-frontend docker-down ## Clean all build artifacts and stop containers

clean-backend: ## Clean backend build artifacts
	@echo "$(BLUE)Cleaning backend...$(NC)"
	@cd $(BACKEND_DIR) && go clean -x
	@rm -f ../bin/stackview-server
	@echo "$(GREEN)✓ Backend cleaned$(NC)"

clean-frontend: ## Clean frontend build artifacts
	@echo "$(BLUE)Cleaning frontend...$(NC)"
	@cd $(FRONTEND_DIR) && rm -rf .next out node_modules build dist
	@echo "$(GREEN)✓ Frontend cleaned$(NC)"

clean-docker: ## Remove all Docker containers and images
	@echo "$(BLUE)Cleaning Docker resources...$(NC)"
	@docker compose -f $(DOCKER_COMPOSE) down -v
	@docker system prune -f
	@echo "$(GREEN)✓ Docker resources cleaned$(NC)"

clean-all: clean clean-docker ## Clean everything including Docker

distclean: clean-all ## Full distclean - same as clean-all
	@echo "$(BLUE)Removing all generated files and caches...$(NC)"
	@find . -name '.DS_Store' -delete
	@find . -name '*.swp' -delete
	@find . -name '*.swo' -delete
	@cd $(BACKEND_DIR) && go mod tidy
	@echo "$(GREEN)✓ Full distclean completed$(NC)"

# ============================================================================
# VERIFICATION TARGETS
# ============================================================================
verify: fmt lint test ## Format, lint, and test all code

verify-backend: fmt-backend lint-backend test-backend ## Verify backend code
	@echo "$(GREEN)✓ Backend verification complete$(NC)"

verify-frontend: fmt-frontend lint-frontend test-frontend ## Verify frontend code
	@echo "$(GREEN)✓ Frontend verification complete$(NC)"

check-docker: ## Check if Docker and docker-compose are installed
	@echo "$(BLUE)Checking Docker installation...$(NC)"
	@which docker >/dev/null && echo "$(GREEN)✓ Docker installed$(NC)" || echo "$(RED)✗ Docker not installed$(NC)"
	@docker compose version >/dev/null 2>&1 && echo "$(GREEN)✓ Docker Compose plugin available$(NC)" || echo "$(RED)✗ Docker Compose not available$(NC)"

check-tools: ## Check if all development tools are available
	@echo "$(BLUE)Checking development tools...$(NC)"
	@which go >/dev/null && echo "$(GREEN)✓ Go installed$(NC)" || echo "$(RED)✗ Go not installed$(NC)"
	@which node >/dev/null && echo "$(GREEN)✓ Node.js installed$(NC)" || echo "$(RED)✗ Node.js not installed$(NC)"
	@which npm >/dev/null && echo "$(GREEN)✓ npm installed$(NC)" || echo "$(RED)✗ npm not installed$(NC)"
	@cd $(BACKEND_DIR) && which golangci-lint >/dev/null && echo "$(GREEN)✓ golangci-lint installed$(NC)" || echo "$(YELLOW)⚠ golangci-lint not installed$(NC)"
	@which dlv >/dev/null && echo "$(GREEN)✓ Delve installed$(NC)" || echo "$(YELLOW)⚠ Delve not installed$(NC)"

# ============================================================================
# HEALTH CHECK TARGETS
# ============================================================================
health: ## Check service health
	@echo "$(BLUE)Checking service health...$(NC)"
	@curl -s http://localhost:8080/api/stacks >/dev/null && echo "$(GREEN)✓ Backend API responding$(NC)" || echo "$(RED)✗ Backend API not responding$(NC)"
	@curl -s http://localhost:3000 >/dev/null && echo "$(GREEN)✓ Frontend responding$(NC)" || echo "$(RED)✗ Frontend not responding$(NC)"

# ============================================================================
# INTEGRATION TARGETS
# ============================================================================
full-build: clean install build ## Full clean build from scratch

full-test: install verify ## Full test run with verification

ci: check-tools full-build full-test ## CI pipeline (build and test everything)

.PHONY: health check-docker check-tools verify verify-backend verify-frontend ci full-build full-test
