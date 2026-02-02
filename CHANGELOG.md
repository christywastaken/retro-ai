# Changelog

All notable changes to the Retro AI Assistant extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-02-02

### Added
- Initial release
- TypeScript and TypeScript React support
- Python support
- Real-time code analysis with debouncing
- Gutter decorations (purple dots) for functions with suggestions
- Line highlighting for functions with suggestions
- Hover provider to view suggestions inline
- Webview panel with syntax-highlighted code suggestions
- Support for multiple Anthropic models (Haiku, Sonnet, Opus)
- Secure API key storage
- Commands for setting API key, selecting model, and clearing suggestions
- Error filtering to skip analysis of incomplete code
- GitHub Actions workflow for automated publishing

### Security
- API keys stored in VS Code's secure secret storage
- No code logging or storage
