# Contributing to AI Model DB

Thank you for your interest in contributing to AI Model DB! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Be respectful and constructive in discussions
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Git
- A code editor (VS Code recommended)

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/AIModelDB.git
cd AIModelDB

# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Run web-only development
npm run dev
```

### Project Structure

```
src/
├── components/     # React UI components
├── hooks/          # Custom React hooks
├── services/       # Business logic and API calls
├── context/        # React Context providers
├── utils/          # Utility functions
├── types/          # TypeScript definitions
└── i18n/           # Translations
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-data-source`
- `fix/sync-error-handling`
- `docs/update-readme`
- `refactor/settings-modal`

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(sync): add support for new data source
fix(settings): correct API key encryption
docs(readme): update installation instructions
```

## Pull Request Process

1. **Create a branch** from `main` for your changes
2. **Make your changes** following the code style guidelines
3. **Write/update tests** if applicable
4. **Update documentation** if needed
5. **Run quality checks**:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
6. **Create a pull request** with a clear description

### PR Description Template

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Added/updated tests
- [ ] Updated documentation
- [ ] Changes generate no new warnings
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Define proper types/interfaces
- Avoid `any` type when possible
- Use functional components and hooks

### React Components

```typescript
// Preferred: Functional component with TypeScript
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onAction}>Click</button>
    </div>
  );
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `ModelCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useSettings.ts`)
- Utilities: `camelCase.ts` (e.g., `formatters.ts`)
- Types: `camelCase.ts` or in `types/index.ts`

### Styling

- Use TailwindCSS utility classes
- Extract common patterns to CSS when appropriate
- Follow existing theme system for colors

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run e2e
```

### Writing Tests

- Place tests next to source files as `*.test.ts(x)`
- Use descriptive test names
- Test edge cases and error conditions

```typescript
import { describe, it, expect } from 'vitest';
import { formatModelName } from './formatters';

describe('formatModelName', () => {
  it('should capitalize first letter', () => {
    expect(formatModelName('test')).toBe('Test');
  });

  it('should handle empty string', () => {
    expect(formatModelName('')).toBe('');
  });
});
```

## Documentation

### Code Comments

- Add JSDoc comments for public functions
- Explain complex logic inline
- Keep comments up to date

```typescript
/**
 * Fetches models from the specified data source
 * @param source - The data source identifier
 * @param options - Fetch options including limit and filters
 * @returns Promise resolving to array of models
 */
export async function fetchModels(
  source: DataSource,
  options: FetchOptions
): Promise<Model[]> {
  // Implementation
}
```

### README Updates

Update the README when:
- Adding new features
- Changing installation steps
- Modifying configuration options

### Changelog Updates

Add entries to CHANGELOG.md for:
- New features
- Bug fixes
- Breaking changes
- Deprecations

## Questions?

If you have questions:
1. Check existing issues and discussions
2. Create a new issue with the `question` label
3. Join our discussions on GitHub

Thank you for contributing!
