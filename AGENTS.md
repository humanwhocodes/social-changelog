# Agent instructions

## Project

Social Changelog is a Node.js library and CLI that generates social media posts from GitHub release notes using OpenAI or Anthropic APIs.

- `src/` contains the CLI, GitHub release fetching, post generators, and shared types (`src/types.ts`).
- `tests/` contains Mocha tests; test fixtures belong in `tests/fixtures/`.
- `README.md` documents the CLI and public API.

## Setup and validation

- Requires Node.js 24 or newer.
- Install dependencies with `npm install`.
- Run the full test suite with `npm test` (this builds the project before running unit tests).
- Run lint with `npm run lint`.
- Build with `npm run build`.

## Conventions

- Follow `.github/copilot-instructions.md` for coding style and project workflow. In particular, use tabs, double-quoted strings, camelCase for functions and variables, and PascalCase for types.
- Update or add tests for behavior changes. When changing CLI options or usage, update `README.md` as well.
- Keep user-facing `console` output in `src/cli.js`; use the established API patterns for asynchronous code and API providers.

## Commits and pull requests

- **Commit messages and pull request titles must use Conventional Commits format:** `type(scope): description`. The scope is optional; choose a relevant scope when useful. Use an appropriate type such as `feat`, `fix`, `docs`, `test`, `refactor`, or `chore`.
- Keep the description concise and imperative, for example: `docs: clarify CLI setup` or `fix(cli): handle missing release tags`.
