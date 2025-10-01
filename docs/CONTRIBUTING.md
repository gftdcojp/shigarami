# Contributing to DepCompat

Thank you for your interest in improving DepCompat! This document provides guidelines for contributing to the project.

## Ways to Contribute

### 🐛 Report Compatibility Issues

The easiest way to contribute is by reporting compatibility issues you encounter:

1. Use our [GitHub Issue template](./.github/ISSUE_TEMPLATE/compatibility-issue.md)
2. Provide as much detail as possible
3. Include exact versions and error messages
4. Test with minimal reproduction cases

### 🛠️ Add Compatibility Data

If you have verified compatibility information:

1. Fork the repository
2. Add your compatibility data to the appropriate JSON files in `store/`
3. Follow the [data schema](./SCHEMA.md)
4. Submit a pull request

### 💻 Improve the Codebase

- Fix bugs
- Add features
- Improve documentation
- Enhance the web interface

## Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm, yarn, or pnpm

### Local Development

```bash
# Clone the repository
git clone https://github.com/junkawasaki/shigrami.git
cd shigrami

# Install dependencies
npm install

# Start development mode
npm run dev

# Build the project
npm run build

# Run tests
npm test
```

### Testing Compatibility

```bash
# Check compatibility for specific packages
npm run check next@15.0.0 react@19.0.0 next-auth@5.0.0-beta.3

# Search existing issues
npm run search next-auth

# View database statistics
npm run stats
```

## Data Schema

Compatibility issues are stored as JSON files with the following structure:

```json
{
  "id": "unique-issue-identifier",
  "framework": "next",
  "version": "15.0.0",
  "react": "19.0.0",
  "node": "20.11.0",
  "packageManager": "npm",
  "libs": {
    "next-auth": "5.0.0-beta.3"
  },
  "status": "fail",
  "error": "ERESOLVE could not resolve peer dependencies",
  "workaround": "Use --legacy-peer-deps or downgrade React",
  "reportedAt": "2024-01-15T10:00:00Z",
  "verified": true,
  "source": "github-issue"
}
```

### Field Descriptions

- **id**: Unique identifier (auto-generated)
- **framework**: Primary framework (next, astro, remix, etc.)
- **version**: Framework version
- **react**: React version (if applicable)
- **node**: Node.js version
- **packageManager**: Package manager used
- **libs**: Additional libraries with versions
- **status**: `pass`, `fail`, or `warn`
- **error**: Error message or description
- **workaround**: Known solutions
- **reportedAt**: ISO timestamp
- **verified**: Manual verification flag
- **source**: Report source (`github-issue`, `ci-test`, `manual`)

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass: `npm test`
6. Update documentation if needed
7. Commit your changes: `git commit -m 'Add amazing feature'`
8. Push to the branch: `git push origin feature/amazing-feature`
9. Open a Pull Request

### PR Guidelines

- Use descriptive commit messages
- Reference related issues
- Include screenshots for UI changes
- Test your changes thoroughly
- Update documentation

## Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful variable and function names
- Add JSDoc comments for public APIs

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Documentation

- Keep README.md up to date
- Document new features
- Update API documentation
- Include code examples

## Community Guidelines

- Be respectful and inclusive
- Help newcomers
- Focus on constructive feedback
- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md)

## Recognition

Contributors will be recognized in:
- Repository contributors list
- Release notes
- Special mentions for significant contributions

## Questions?

If you have questions about contributing:

- Check existing issues and documentation
- Open a discussion in GitHub Discussions
- Contact maintainers

Thank you for helping make DepCompat better! 🚀
