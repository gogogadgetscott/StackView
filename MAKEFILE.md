# StackView Makefile Usage Guide

## Quick Start

```bash
# Show all available commands
make help

# Run everything with Docker
make run
# or
make dev-docker

# Run backend and frontend separately (development)
make dev

# Build both services
make build

# Run tests
make test

# Clean everything
make clean
```

---

## BUILD COMMANDS

| Command | Purpose |
|---------|---------|
| `make build` | Build both backend and frontend |
| `make build-backend` | Build Go backend binary to `bin/stackview-server` |
| `make build-frontend` | Build Next.js frontend (production build) |
| `make full-build` | Clean build from scratch |

---

## RUN COMMANDS

### Development Mode (Local)
```bash
# Run backend and frontend in separate terminals
make run-dev

# Only backend (requires Docker socket)
make run-backend

# Only frontend (dev server on port 3000)
make run-frontend
```

### Docker Mode
```bash
# Build and run with Docker Compose
make run

# Run in background
make run-docker-detached

# Development with Docker
make dev-docker
```

---

## TEST COMMANDS

```bash
# Run all tests
make test

# Backend only
make test-backend

# Backend with coverage report (HTML)
make test-backend-coverage

# Frontend only
make test-frontend

# Frontend with coverage
make test-frontend-coverage

# Full verification (format + lint + test)
make verify
```

---

## DEBUG COMMANDS

### Standard Debug
```bash
# Debug both services
make debug

# Debug backend only
make debug-backend

# Debug frontend only
make debug-frontend

# Debug with Docker
make debug-docker
```

### Advanced Debugging with Delve

```bash
# Start Delve debugger on backend (port 2345)
make debug-backend-delve

# In another terminal, connect with:
dlv connect localhost:2345
```

---

## DOCKER COMMANDS

```bash
# Build Docker images
make docker-build

# Build without cache
make docker-build-no-cache

# Start containers
make docker-up

# Stop containers
make docker-down

# View logs (all)
make docker-logs

# View logs (backend only)
make docker-logs-backend

# View logs (frontend only)
make docker-logs-frontend

# List running containers
make docker-ps

# Restart containers
make docker-restart

# Shell into backend container
make docker-shell-backend

# Shell into frontend container
make docker-shell-frontend

# Pull latest images
make docker-pull
```

---

## LINT & FORMAT COMMANDS

```bash
# Format all code
make fmt

# Format backend only (Go fmt)
make fmt-backend

# Format frontend only (Prettier/ESLint)
make fmt-frontend

# Lint all code
make lint

# Lint backend (requires golangci-lint)
make lint-backend

# Lint frontend (ESLint)
make lint-frontend
```

---

## INSTALL COMMANDS

```bash
# Install all dependencies
make install

# Install backend deps (go mod)
make install-backend

# Install frontend deps (npm)
make install-frontend

# Install development tools (dlv, golangci-lint)
make install-tools
```

---

## CLEANUP COMMANDS

```bash
# Clean build artifacts (keep Docker)
make clean

# Clean backend only
make clean-backend

# Clean frontend only
make clean-frontend

# Clean all including Docker
make clean-all

# Full distclean (everything)
make distclean

# Remove Docker resources
make clean-docker
```

---

## VERIFICATION COMMANDS

```bash
# Verify code (fmt + lint + test)
make verify

# Verify backend
make verify-backend

# Verify frontend
make verify-frontend

# Check Docker installation
make check-docker

# Check development tools
make check-tools

# Check service health
make health

# CI pipeline (full build and test)
make ci
```

---

## Common Workflows

### First Time Setup
```bash
make install
make lint
make test
```

### Local Development
```bash
make dev
# Opens backend and frontend in current terminal
# Stop with Ctrl+C
```

### Docker Development
```bash
make dev-docker
# Runs everything with Docker Compose
# Stop with Ctrl+C
```

### Before Committing
```bash
make verify
# Formats, lints, and tests all code
```

### Full CI Pipeline
```bash
make ci
# Checks tools, builds, and tests everything
```

### Debugging Backend
```bash
# Terminal 1 - Start Delve debugger
make debug-backend-delve

# Terminal 2 - Connect debugger
dlv connect localhost:2345
```

### Building for Production
```bash
make full-build
# Clean build from scratch
```

### Complete Cleanup
```bash
make distclean
# Removes all build artifacts, caches, and Docker resources
```

---

## Environment Variables

When running locally, you may need to set:

```bash
# Docker socket location (usually automatic)
export DOCKER_SOCK=/var/run/docker.sock

# Backend debug mode
export STACKVIEW_DEBUG=1

# Stack roots for backend
export STACKVIEW_STACK_ROOTS=/stacks

# SQLite database path
export STACKVIEW_SQLITE_PATH=./stackview.db

# Frontend WebSocket URL
export NEXT_PUBLIC_STACKVIEW_WS=ws://localhost:8080/ws/stats
```

---

## Tips

1. **Color Output**: The Makefile uses colors for better readability
2. **Help System**: Run `make help` anytime to see all available commands
3. **Safety**: Most commands handle errors gracefully
4. **Docker**: Requires Docker and Docker Compose to be installed
5. **Go**: Requires Go 1.16+ for backend development
6. **Node**: Requires Node.js 16+ and npm 7+ for frontend

---

## Troubleshooting

### "Go not installed"
Install Go from https://golang.org/dl/

### "golangci-lint not installed"
Run: `make install-tools`

### "Docker not found"
Install Docker from https://docs.docker.com/get-docker/

### Port already in use
- Backend: port 8080
- Frontend: port 3000

Stop the conflicting service or use different ports.

### Permission denied error
For Docker commands, you may need to:
```bash
sudo usermod -aG docker $USER
# Then log out and log back in
```
