# Contributing to StackView

Thank you for your interest in contributing! This document provides guidelines for contributing to the StackView project.

## Code of Conduct

Be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/stackview.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit with clear messages (see below)
6. Push to your fork
7. Open a Pull Request

## Git Commit Conventions

We follow Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build, dependencies, or tooling changes
- `ci`: CI/CD configuration changes

### Scope
Use one of: `backend`, `frontend`, `docker`, `ci`, `docs`

### Subject
- Use imperative mood ("add" not "added")
- Don't capitalize first letter
- No period at the end
- Maximum 50 characters

### Examples

```
feat(backend): add graceful shutdown handler
fix(frontend): resolve websocket connection timeout
docs(readme): update installation instructions
test(backend): add unit tests for stats calculation
```

## Development Workflow

### Backend (Go)

```bash
cd backend

# Run tests
go test ./...

# Run linter
golangci-lint run

# Format code
gofmt -s -w .

# Build
go build -o bin/stackview-server ./cmd/server
```

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Lint and format check
npm run lint
npm run format:check

# Format code
npm run format

# Type check
npm run type-check

# Run tests
npm test

# Build
npm run build
```

### Docker

```bash
# Build and run locally
docker-compose -f docker-compose.debug.yml up

# Build specific service
docker-compose -f docker-compose.debug.yml build backend-dev
```

## Code Quality Standards

### Backend (Go)
- All code must pass `golangci-lint`
- Use proper error handling
- Add tests for new functionality
- Document exported functions and packages

### Frontend (TypeScript/React)
- All code must pass ESLint
- Code must be formatted with Prettier
- Maintain TypeScript strict mode compliance
- Add unit tests for components and utilities
- Write descriptive component prop types

## Pull Request Process

1. Ensure all tests pass: `go test ./...` (backend) or `npm test` (frontend)
2. Run linters: `golangci-lint run` (backend) or `npm run lint` (frontend)
3. Format code: `gofmt -s -w .` (backend) or `npm run format` (frontend)
4. Update documentation if needed
5. Add tests for new functionality
6. Reference any related issues in the PR description

## CI/CD Pipeline

The following checks run automatically on all PRs:

- **Backend**
  - `golangci-lint` linting
  - Unit tests with race detector
  - Code coverage reporting
  - Build verification

- **Frontend**
  - ESLint linting
  - Prettier formatting check
  - TypeScript type checking
  - Build verification

- **Docker**
  - Image build verification

All checks must pass before merging.

## Release Process

1. Update version numbers following [Semantic Versioning](https://semver.org/)
2. Update CHANGELOG
3. Create a git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. Create GitHub Release with changelog notes

## Questions or Need Help?

- Check existing [GitHub Issues](https://github.com/gogogadgetscott/stackview/issues)
- Open a new issue with the `question` label
- Review documentation in README.md

Thank you for contributing to StackView!
