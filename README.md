# Shigrami - Dependency Compatibility Database

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

Shigrami is a Context7-inspired system for tracking and preventing dependency compatibility issues in JavaScript/TypeScript projects. Like Context7 provides library documentation, Shigrami provides compatibility data to prevent "dependency hell" before it happens.

## 🚀 Features

- **Compatibility Database**: Structured JSON database of known compatibility issues
- **MCP Server**: Integration with AI assistants via Model Context Protocol
- **Web Dashboard**: Searchable web interface for browsing compatibility issues
- **CI Integration**: Automated testing of dependency combinations
- **Community Driven**: GitHub Issues for reporting new compatibility problems

## 📊 Quick Compatibility Matrix

| Framework | React | Node.js | Status | Notes |
|-----------|-------|---------|--------|-------|
| Next.js 15 | 19.0  | 20.x   | ❌    | Peer dependency conflicts |
| Next.js 14 | 18.2  | 18.x   | ✅    | Stable |
| Astro 4.0  | 18.2  | 20.x   | ⚠️    | Some hydration warnings |

## 🛠 Installation

```bash
npm install -g depcompat
# or
yarn global add depcompat
# or
pnpm add -g depcompat
```

## 🚀 Usage

### MCP Server Integration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "depcompat": {
      "command": "npx",
      "args": ["-y", "depcompat", "mcp"]
    }
  }
}
```

### Web Dashboard

```bash
npx depcompat dashboard
```

Visit `http://localhost:3000` to browse compatibility issues.

### CLI Commands

```bash
# Check compatibility for specific packages
npx depcompat check next@15.0.0 react@19.0.0

# List known issues
npx depcompat issues --framework next

# Add new compatibility issue
npx depcompat report --framework next@15.0.0 --libs "react@19.0.0,next-auth@5.0.0-beta.3"
```

## 📁 Project Structure

```
depcompat/
├── src/
│   ├── mcp/           # Model Context Protocol server
│   ├── web/           # Web dashboard
│   ├── cli/           # Command line interface
│   ├── data/          # Compatibility database
│   └── types/         # TypeScript type definitions
├── data/              # Compatibility issue database
├── docs/              # Detailed issue documentation
├── .github/
│   ├── workflows/     # CI/CD pipelines
│   └── ISSUE_TEMPLATE/# GitHub issue templates
└── tests/             # Test suites
```

## 🌐 Live Demo

Browse the compatibility database at: **[https://junkawasaki.github.io/shigrami/](https://junkawasaki.github.io/shigrami/)**

The web interface provides:
- 🔍 Real-time search and filtering
- 📊 Interactive compatibility matrix
- 📱 Responsive design
- 🔗 Direct links to related issues

## 🤝 Contributing

### Report Compatibility Issues

Use our [GitHub Issue template](.github/ISSUE_TEMPLATE/compatibility-issue.md) to report new dependency conflicts.

### Development Setup

```bash
git clone https://github.com/junkawasaki/shigrami.git
cd shigrami
npm install
npm run dev
```

### Adding Compatibility Data

Compatibility issues are stored as JSON files in the `data/` directory:

```json
{
  "id": "next15-react19-peer-deps-001",
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
  "workaround": "Use --legacy-peer-deps or downgrade React to 18.2.0",
  "reportedAt": "2024-01-15T10:00:00Z",
  "verified": true,
  "source": "github-issue"
}
```

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed contribution guidelines.

## 🔍 Compatibility Schema

### Required Fields

- `framework`: Primary framework (next, astro, remix, etc.)
- `version`: Framework version
- `status`: `pass`, `fail`, or `warn`

### Optional Fields

- `react`: React version (if applicable)
- `node`: Node.js version
- `libs`: Additional libraries with versions
- `error`: Error message or description
- `workaround`: Known workarounds
- `reportedAt`: ISO date string
- `verified`: Boolean indicating manual verification

## 🤖 MCP Integration

DepCompat provides MCP tools for AI assistants:

- `resolve-compatibility`: Check compatibility for package combinations
- `get-compatibility-issues`: Get detailed issue information
- `search-compatibility`: Search compatibility database

## 📈 CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Check Dependency Compatibility
  run: npx depcompat check --ci
```

## 📚 Documentation

- [API Reference](./docs/api.md)
- [Contributing Guide](./docs/contributing.md)
- [Compatibility Database Schema](./docs/schema.md)

## 🎯 Roadmap

- [ ] Web dashboard with advanced filtering
- [ ] Automated dependency conflict detection
- [ ] Integration with popular package managers
- [ ] Historical compatibility tracking
- [ ] Community voting on workarounds

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Inspired by [Context7](https://context7.ai) and the need for better dependency management in the JavaScript ecosystem.

---

**"Share your broken builds. Save someone else a weekend."**
