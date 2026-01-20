# Changelog

All notable changes to StackView will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CI/CD pipeline with GitHub Actions
- ESLint and Prettier configuration for frontend code quality
- golangci-lint configuration for backend code quality
- Pre-commit hooks for automated local checks
- Frontend unit tests with Jest and React Testing Library
- Backend unit tests for stats calculation
- Improved error handling in main server entry point
- Dependabot configuration for automatic dependency updates
- Contributing guidelines document
- Comprehensive README with development instructions

### Changed
- Enhanced error messages in server startup
- Improved logging consistency
- Better shutdown handling with timeout
- WebSocket buffer sizes configured for better performance

### Fixed
- Graceful shutdown now waits for connections to close
- Docker client connection validation on startup

## [1.0.0] - 2025-01-20

### Added
- Initial release
- Real-time Docker container statistics streaming
- WebSocket-based communication
- Web UI for monitoring containers
- Docker Compose setup for development

---

## How to Contribute Changes

1. Make your changes following the [contribution guidelines](CONTRIBUTING.md)
2. Use conventional commits: `type(scope): description`
3. Update this CHANGELOG under `[Unreleased]` section
4. Include the type in the CHANGELOG entry:
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for now removed features
   - `Fixed` for any bug fixes
   - `Security` for security fixes

When releasing a new version:
1. Rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`
2. Create a new `[Unreleased]` section
3. Add comparison link at the bottom
