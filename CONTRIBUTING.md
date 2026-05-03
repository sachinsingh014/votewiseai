# Contributing to VoteWise AI

First off, thank you for considering contributing to VoteWise AI. It's people like you that make VoteWise AI such a great tool.

## Code Style Guide
- **Javascript**: We use ESLint and Prettier to enforce consistent styling. Always run `npm run lint:fix` and `npm run format` before committing.
- **Components**: All React components must use `PropTypes` for validation.
- **Documentation**: All files must have a `@fileoverview` block and use proper JSDoc tags (`@param`, `@returns`, `@throws`) for all functions and classes.
- **Security**: Be mindful of security patterns. Use the `sanitizeValue` utility for all user input and never concatenate user input with system prompts.

## Branch Naming Convention
- `feat/`: for new features (e.g. `feat/analytics-dashboard`)
- `fix/`: for bug fixes (e.g. `fix/rate-limiter-bug`)
- `docs/`: for documentation changes
- `chore/`: for maintenance tasks like dependency updates

## Pull Request Checklist
Before submitting a PR, ensure you have:
- [ ] Run `npm test` and all tests pass with 100% coverage on critical modules.
- [ ] Run `npm run lint` with 0 warnings/errors.
- [ ] Updated `ARCHITECTURE.md` or `SYSTEM_FLOW.md` if making architectural changes.
- [ ] Added tests for any new functionality, including edge-case tests where appropriate.
