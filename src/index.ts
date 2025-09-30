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
import { PropertyGraphStore } from './store/property-graph-store.js';
import { DerivationBuilder } from './store/derivation.js';

async function main() {
  const db = new CompatibilityDatabaseManager();
  const store = new PropertyGraphStore('@store');

  // Initialize database and store
  await db.initialize();
  await store.initialize();

  program
    .name('shigrami')
    .description('Dependency Compatibility Database - Context7-like system for tracking package conflicts')
    .version('0.1.0');

  // MCP server command
  program
    .command('mcp')
    .description('Start MCP server for AI assistant integration')
    .option('--api-key <key>', 'API key for authentication (if required)')
    .action(async (options: any) => {
      const server = new DepCompatMCPServer(db);
      await server.start();
    });

  // Web dashboard command
  program
    .command('dashboard')
    .description('Start web dashboard server')
    .option('-p, --port <port>', 'Port to run the server on', '3000')
    .option('--host <host>', 'Host to bind to', 'localhost')
    .action(async (options: any) => {
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
    .action(async (framework: string, packages: string[], options: any) => {
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
    .action(async (query: string | undefined, options: any) => {
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
    .action(async (options: any) => {
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
    .action(async (options: any) => {
      const cli = new CLI(db);
      await cli.exportDatabase(options.output);
    });

  // Store commands
  program
    .command('store')
    .description('Nix Store-like derivation hash based storage commands');

  program
    .command('store:put')
    .description('Store compatibility data in derivation-based store')
    .action(async () => {
      console.log('📦 Storing compatibility data...');
      const issues = await db.queryIssues({ limit: 1000 }); // Get all issues
      const hash = await store.storeCompatibilityData(issues);
      console.log(`✅ Stored with derivation hash: ${hash}`);
    });

  program
    .command('store:get <hash>')
    .description('Retrieve compatibility data from store by derivation hash')
    .action(async (hash: string) => {
      console.log(`🔍 Retrieving data for hash: ${hash}`);
      const data = await store.getCompatibilityData(hash);
      if (data) {
        console.log(`✅ Found ${data.length} compatibility issues`);
        console.log(`📊 Status breakdown:`);
        const stats = data.reduce((acc, issue) => {
          acc[issue.status] = (acc[issue.status] || 0) + 1;
          return acc;
        }, {});
        Object.entries(stats).forEach(([status, count]) => {
          console.log(`   ${status.toUpperCase()}: ${count}`);
        });
      } else {
        console.log('❌ No data found for this hash');
      }
    });

  program
    .command('store:list')
    .description('List all derivation hashes in store')
    .action(async () => {
      const hashes = await store['manager']['storeManager'].listDerivations();
      console.log(`📋 Stored derivations: ${hashes.length}`);
      hashes.slice(0, 10).forEach(hash => {
        console.log(`   ${hash}`);
      });
      if (hashes.length > 10) {
        console.log(`   ... and ${hashes.length - 10} more`);
      }
    });

  program
    .command('store:stats')
    .description('Show store statistics')
    .action(async () => {
      const stats = await store.getStoreStats();
      console.log('📊 Store Statistics:');
      console.log(`   Total entries: ${stats.totalEntries}`);
      console.log(`   Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
      console.log(`   Cache hits: ${stats.cacheHits}`);
      console.log(`   Average entry size: ${(stats.averageEntrySize / 1024).toFixed(2)} KB`);
      if (stats.oldestEntry) {
        console.log(`   Oldest entry: ${new Date(stats.oldestEntry).toLocaleDateString()}`);
        console.log(`   Newest entry: ${new Date(stats.newestEntry).toLocaleDateString()}`);
      }
    });

  program
    .command('store:export <hash>')
    .description('Export stored graph to file')
    .option('-f, --format <format>', 'Export format (json/jsonl/csv)', 'json')
    .option('-o, --output <file>', 'Output file')
    .action(async (hash: string, options: any) => {
      const format = options.format;
      const data = await store.exportGraph(hash, format);
      const outputFile = options.output || `export_${hash}.${format}`;

      const fs = await import('fs/promises');
      await fs.writeFile(outputFile, data);
      console.log(`✅ Exported to ${outputFile} (${data.length} bytes)`);
    });

  program
    .command('derivation-hash')
    .description('Compute derivation hash for given parameters')
    .option('-f, --framework <name>', 'Framework name')
    .option('-V, --framework-version <version>', 'Framework version')
    .option('-r, --react <version>', 'React version')
    .option('-n, --node <version>', 'Node.js version')
    .option('-p, --package-manager <manager>', 'Package manager')
    .option('-l, --libs <libs>', 'Libraries as JSON string')
    .action(async (options: any) => {
      const builder = new DerivationBuilder();

      if (options.framework && options.frameworkVersion) {
        builder.framework(options.framework, options.frameworkVersion);
      }
      if (options.react) builder.react(options.react);
      if (options.node) builder.node(options.node);
      if (options.packageManager) builder.packageManager(options.packageManager);
      if (options.libs) {
        try {
          const libs = JSON.parse(options.libs);
          builder.libraries(libs);
        } catch (error) {
          console.error('❌ Invalid libs JSON');
          process.exit(1);
        }
      }

      try {
        const hash = builder.getHash();
        const derivation = builder.build();
        console.log(`🔢 Derivation Hash: ${hash}`);
        console.log(`📋 Derivation: ${JSON.stringify(derivation, null, 2)}`);
      } catch (error) {
        console.error('❌ Failed to create derivation:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
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
  console.log('\nShutting down Shigrami...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Shigrami...');
  process.exit(0);
});

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
