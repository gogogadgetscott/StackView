# StackView
Unified view of Docker container runtime, stacks, and live telemetry with real-time WebSocket streaming.

## Features

- 🐳 Real-time Docker container monitoring
- 📊 Live CPU and memory statistics via WebSocket
- 🎯 Clean, modern web interface built with Next.js
- ⚡ High-performance Go backend
- 🔄 Graceful connection handling and recovery

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Go 1.24+
- Node.js 20+
- npm or yarn

### Development

```bash
# Start all services (backend + frontend)
docker-compose -f docker-compose.debug.yml up

# Frontend: http://localhost:3000
# Backend: http://localhost:8080
```

### Manual Setup

**Backend:**
```bash
cd backend
go mod download
go run ./cmd/server
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Development

For detailed development instructions, code style guidelines, and commit conventions, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Linting & Formatting

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
npm run format:check      # Check formatting
npm run type-check        # TypeScript validation
npm test                  # Run tests
```

### Pre-commit Hooks

Set up automatic linting before commits:

```bash
# Install pre-commit
pip install pre-commit

# Install git hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

## CI/CD

Automated checks run on all pull requests:

- ✅ Backend: linting, unit tests, build verification
- ✅ Frontend: linting, formatting, type checking, build verification
- ✅ Docker: image build verification

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for details.

## Project Structure

```
.
├── backend/                 # Go HTTP server + WebSocket handler
│   ├── cmd/server/         # Application entry point
│   ├── internal/server/    # HTTP handlers and WebSocket logic
│   ├── go.mod             # Go module file
│   └── Dockerfile         # Container image
├── frontend/               # Next.js web application
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── lib/               # Utilities and types
│   ├── styles/            # CSS/Tailwind styles
│   └── package.json       # Dependencies
├── scripts/               # Helper scripts
├── docker-compose.yml     # Production compose file
├── docker-compose.debug.yml # Development compose file
└── CONTRIBUTING.md        # Contribution guidelines
```

## Architecture

- **Backend**: Go server with Gorilla WebSocket for real-time stats streaming from Docker API
- **Frontend**: Next.js with TypeScript, React, TailwindCSS, and Recharts for visualization
- **Communication**: WebSocket for real-time bidirectional communication

## Dependencies

### Backend
- `github.com/docker/docker`: Docker SDK
- `github.com/gorilla/websocket`: WebSocket support

### Frontend
- `next`: React framework
- `react`: UI library
- `tailwindcss`: Styling
- `recharts`: Data visualization
- `@tanstack/react-table`: Table utilities
- `lucide-react`: Icons

## License

ISC

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.