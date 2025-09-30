#!/usr/bin/env node

/**
 * DepCompat - Main Entry Point
 * Merkle DAG Root: project_entry
 *
 * Entry point for the DepCompat CLI and MCP server.
 * Routes commands to appropriate handlers based on process network topology.
 */

import { program } from 'commander';
import { CompatibilityDatabaseManager } from './data/database.js';
import { DepCompatMCPServer } from './mcp/server.js';
import { setupWebServer } from './web/server.js';
import { CLI } from './cli/index.js';

async function main() {
  const db = new CompatibilityDatabaseManager();

  // Initialize database
  await db.initialize();

  program
    .name('depcompat')
    .description('Dependency Compatibility Database - Context7-like system for tracking package conflicts')
    .version('0.1.0');

  // MCP server command
  program
    .command('mcp')
    .description('Start MCP server for AI assistant integration')
    .option('--api-key <key>', 'API key for authentication (if required)')
    .action(async (options) => {
      const server = new DepCompatMCPServer(db);
      await server.start();
    });

  // Web dashboard command
  program
    .command('dashboard')
    .description('Start web dashboard server')
    .option('-p, --port <port>', 'Port to run the server on', '3000')
    .option('--host <host>', 'Host to bind to', 'localhost')
    .action(async (options) => {
      const port = parseInt(options.port);
      const host = options.host;
      await setupWebServer(db, { port, host });
    });

  // CLI commands for compatibility checking
  program
    .command('check <framework> [packages...]')
    .description('Check compatibility for a framework and packages')
    .option('-n, --node <version>', 'Node.js version')
    .option('-p, --package-manager <manager>', 'Package manager (npm/yarn/pnpm)')
    .action(async (framework, packages, options) => {
      const cli = new CLI(db);
      await cli.checkCompatibility(framework, packages, options);
    });

  // Search command
  program
    .command('search [query]')
    .description('Search compatibility database')
    .option('-f, --framework <framework>', 'Filter by framework')
    .option('-s, --status <status>', 'Filter by status (pass/fail/warn)')
    .option('-l, --limit <number>', 'Limit results', '10')
    .action(async (query, options) => {
      const cli = new CLI(db);
      await cli.searchCompatibility(query, options);
    });

  // Report new issue command
  program
    .command('report')
    .description('Report a new compatibility issue')
    .option('-f, --framework <framework>', 'Framework name and version (e.g., next@15.0.0)')
    .option('-r, --react <version>', 'React version')
    .option('-n, --node <version>', 'Node.js version')
    .option('-p, --package-manager <manager>', 'Package manager')
    .option('-l, --libs <libs>', 'Additional libraries (JSON string)')
    .option('-s, --status <status>', 'Compatibility status (pass/fail/warn)')
    .option('-e, --error <error>', 'Error description')
    .option('-w, --workaround <workaround>', 'Workaround description')
    .option('-v, --verified', 'Mark as verified')
    .action(async (options) => {
      const cli = new CLI(db);
      await cli.reportIssue(options);
    });

  // Stats command
  program
    .command('stats')
    .description('Show database statistics')
    .action(async () => {
      const cli = new CLI(db);
      await cli.showStats();
    });

  // Export command
  program
    .command('export')
    .description('Export compatibility database')
    .option('-o, --output <file>', 'Output file', 'compatibility-db.json')
    .action(async (options) => {
      const cli = new CLI(db);
      await cli.exportDatabase(options.output);
    });

  // If no command is provided and we're being called as an MCP server
  if (process.argv.length === 2 || process.argv.includes('--transport')) {
    // Check if this is an MCP call
    const hasTransport = process.argv.includes('--transport') ||
                        process.argv.includes('stdio') ||
                        process.env.MCP_TRANSPORT === 'stdio';

    if (hasTransport) {
      const server = new DepCompatMCPServer(db);
      await server.start();
      return;
    }
  }

  await program.parseAsync();
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down DepCompat...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down DepCompat...');
  process.exit(0);
});

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
