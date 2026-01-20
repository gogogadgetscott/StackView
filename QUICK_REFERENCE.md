# StackView - Quick Reference Guide

## Common Commands

### 🚀 Development

```bash
# Start everything
docker-compose -f docker-compose.debug.yml up

# Frontend only
cd frontend && npm run dev          # http://localhost:3000

# Backend only
cd backend && go run ./cmd/server   # http://localhost:8080
```

### 🧪 Testing & Linting

```bash
# Backend
cd backend
go test ./...                       # Run tests
golangci-lint run                   # Lint
gofmt -s -w .                       # Format

# Frontend
cd frontend
npm test                            # Jest tests
npm run lint                        # ESLint
npm run format                      # Prettier format
npm run type-check                  # TypeScript check
```

### 📝 Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit with conventional commits
git commit -m "type(scope): description"

# Examples:
git commit -m "feat(backend): add new endpoint"
git commit -m "fix(frontend): resolve button click"
git commit -m "docs: update README"

# Push and create PR
git push origin feature/my-feature
```

### 🔍 Code Quality

```bash
# Run pre-commit hooks manually
pre-commit run --all-files

# Or setup to run automatically on commit
pip install pre-commit
pre-commit install
```

## Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(backend): add graceful shutdown` |
| `fix` | Bug fix | `fix(frontend): resolve websocket timeout` |
| `docs` | Documentation | `docs: update setup instructions` |
| `style` | Formatting only | `style: format code with prettier` |
| `refactor` | Code refactor | `refactor(backend): simplify stats logic` |
| `perf` | Performance | `perf(frontend): optimize render` |
| `test` | Tests | `test(backend): add unit tests` |
| `chore` | Build/deps | `chore: update dependencies` |
| `ci` | CI/CD | `ci: add codecov integration` |

## File Structure

```
StackView/
├── .github/
│   ├── workflows/          # CI/CD automation
│   │   └── ci.yml         # GitHub Actions
│   └── dependabot.yml     # Auto dependency updates
├── backend/
│   ├── cmd/server/
│   │   └── main.go
│   ├── internal/server/
│   │   ├── server.go
│   │   ├── ws.go
│   │   └── ws_test.go    # Tests
│   ├── .golangci.yml     # Lint config
│   └── go.mod
├── frontend/
│   ├── app/
│   ├── components/
│   ├── __tests__/        # Jest tests
│   ├── eslint.config.js  # Lint config
│   ├── .prettierrc        # Format config
│   ├── jest.config.js    # Test config
│   └── package.json
├── .pre-commit-config.yaml
├── .gitignore
├── CONTRIBUTING.md       # How to contribute
├── CHANGELOG.md          # Change history
└── README.md             # Project overview
```

## Useful Links

- [GitHub Workflow Status](.github/workflows/ci.yml)
- [Contribution Guidelines](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Full Improvements Doc](IMPROVEMENTS.md)

## Troubleshooting

### Docker connection issues
```bash
# Check Docker socket is available
docker ps

# Verify Docker socket is mounted in container
docker-compose -f docker-compose.debug.yml exec backend-dev ls -la /var/run/docker.sock
```

### Node modules issues
```bash
# Clean install
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Go mod issues
```bash
# Clean cache
cd backend
go clean -modcache
go mod download
```

### Pre-commit hook issues
```bash
# Reinstall hooks
pre-commit install

# Check hook configuration
cat .pre-commit-config.yaml
```

## Performance Tips

- Run linting/formatting locally with pre-commit hooks before pushing
- Use TypeScript strict mode to catch errors early
- Run tests locally with `npm test` before committing
- Monitor coverage reports in CI

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Actions](https://github.com/features/actions)
