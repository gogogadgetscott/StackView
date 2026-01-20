# StackView

> **Dockge-style compose-first manager with observability + live telemetry**

A modern Docker stack manager that treats compose files as the source of truth. Real-time WebSocket streaming, historical metrics, and intelligent alerting—all with zero hidden state.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

## Philosophy

StackView follows three core principles:

**🔍 No Hidden State** — Everything is compose files and labels. StackView discovers stacks by scanning your compose directories and matches containers via `com.docker.compose.project` labels. What you see in your compose files is your single source of truth.

**📊 Observability First** — Unlike typical container dashboards, StackView is built around live telemetry. Real-time CPU/memory sparklines, historical graphs across 24h/7d, and configurable alert rules make it your container observability hub.

**⚡ Speed & Low Friction** — Inspired by Dockge's fast, one-glance philosophy. Status badges, tooltips, and minimal clicks. The main page shows everything at a glance—no deep navigation trees.

## Features

- 🐳 **Compose-First Discovery** — Scans directories for compose files, auto-matches running containers
- 📊 **Live Telemetry** — Real-time CPU/memory streaming via WebSocket (1s cadence)
- 📈 **Historical Graphs** — Per-stack CPU, memory, and restart counts over 24h/7d
- 🔔 **Smart Alerts** — Configurable rules (restarts > N, CPU > 90%, memory thresholds)
- 🎯 **One-Glance Dashboard** — Status badges, sparklines, quick actions
- 🖥️ **Stack Controls** — Start, stop, recreate, redeploy with pull
- 📝 **Compose Editor** — View and edit docker-compose.yml, see diff against running state
- 🔄 **Multi-Host Ready** — Connect additional Docker hosts

## Quick Start

### Single Command Deploy

```bash
# Create data directory
mkdir -p ~/stackview-data

# Run StackView
docker run -d \
  --name stackview \
  -p 9000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ~/docker:/stacks:ro \
  -v ~/stackview-data:/data \
  -e STACKVIEW_STACK_ROOTS=/stacks \
  stackview:latest

# Open http://localhost:9000
```

### Docker Compose

```yaml
# docker-compose.stackview.yml
services:
  stackview:
    image: stackview:latest
    container_name: stackview
    restart: unless-stopped
    ports:
      - "9000:3000"
      - "9080:8080"  # API/WebSocket
    environment:
      - STACKVIEW_STACK_ROOTS=/stacks
      - STACKVIEW_SQLITE_PATH=/data/stackview.db
    volumes:
      # Required: Docker socket for container monitoring
      - /var/run/docker.sock:/var/run/docker.sock
      # Required: Your compose stacks directories
      - ~/docker:/stacks:ro
      # Required: Persistent storage for history & config
      - stackview_data:/data

volumes:
  stackview_data:
```

```bash
docker-compose -f docker-compose.stackview.yml up -d
```

### First Run

On first launch, StackView guides you through:

1. **Stack Directories** — Select which directories to scan for compose files
2. **Remote Hosts** — Optionally connect additional Docker hosts
3. **Basic Alerts** — Set up notification rules for restarts and resource thresholds

## Development

### Prerequisites

- Docker & Docker Compose
- Go 1.24+
- Node.js 20+

### Development Mode

```bash
# Start all services with hot reload
docker-compose -f docker-compose.debug.yml up

# Frontend: http://localhost:3000
# Backend: http://localhost:8080
```

For detailed development instructions, code style guidelines, and commit conventions, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Linting & Testing

**Backend (Go):**
```bash
cd backend
golangci-lint run        # Lint
gofmt -s -w .             # Format
go test ./...             # Test
```

**Frontend (TypeScript/React):**
```bash
cd frontend
npm run lint              # ESLint
npm run format            # Prettier format
npm test                  # Run tests
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │Stack Cards│ │Container │ │Historical│ │  Alert Config    ││
│  │          │ │  Table   │ │  Graphs  │ │                  ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │ WebSocket + REST
┌───────────────────────────▼─────────────────────────────────┐
│                        Backend (Go)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │  Stacks  │ │   Stats  │ │  History │ │     Alerts       ││
│  │  Manager │ │   WS     │ │  Storage │ │    Evaluator     ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │ Docker API
┌───────────────────────────▼─────────────────────────────────┐
│                     Docker Engine(s)                         │
│    Compose Stacks → Containers → Labels → Metrics            │
└─────────────────────────────────────────────────────────────┘
```

- **Stacks Manager**: Scans compose directories, matches containers by labels
- **Stats WebSocket**: Streams live CPU/memory at 1s intervals
- **History Storage**: SQLite with 1-minute aggregation, 7-day retention
- **Alerts Evaluator**: Checks rules every 10s, dispatches notifications

## Project Structure

```
.
├── backend/                 # Go HTTP server + WebSocket handler
│   ├── cmd/server/         # Application entry point
│   ├── internal/
│   │   ├── server/         # HTTP handlers and WebSocket logic
│   │   ├── stacks/         # Stack discovery and management
│   │   ├── history/        # Stats history storage
│   │   └── alerts/         # Alert rules and evaluation
│   └── Dockerfile
├── frontend/               # Next.js web application
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   │   ├── container-table.tsx
│   │   ├── stack-card.tsx
│   │   ├── stack-history.tsx
│   │   └── alert-config.tsx
│   ├── lib/               # Utilities and types
│   └── styles/            # TailwindCSS
├── docker-compose.yml          # Production
├── docker-compose.debug.yml    # Development
└── docker-compose.stackview.yml # Single-command deploy
```

## License

ISC

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.