#!/usr/bin/env node
/**
 * DepCompat - Main Entry Point
 * Merkle DAG Root: project_entry
 *
 * Entry point for the DepCompat CLI and MCP server.
 * Routes commands to appropriate handlers based on process network topology.
 */
import { Effect } from 'effect';
import { NodeRuntime } from '@effect/platform-node';
import { CLI } from './cli/index.js';
import { CompatibilityDatabaseManager } from './data/database.js';
import { DepCompatMCPServer, startMCPServer } from './mcp/server.js';
import { setupWebServer } from './web/server.js';
import { PropertyGraphStore } from './store/property-graph-store.js';
import { DerivationBuilder } from './store/derivation.js';
import { checkGraphCommand, statsCommand, searchCommand, exportCommand, fetchCompatCommand, storePutCommand, storeGetCommand, storeListCommand, storeStatsCommand, reportIssueCommand, resolveDependenciesCommand, derivationHashCommand, analyzeCommand, // Add analyzeCommand
ShigaramiCliLive } from './cli/commands.js';
import { kaitoNewCommand, kaitoReportCommand, kaitoRunCommand } from './cli/kaito.js';
import { Command } from 'commander';
async function main() {
    const db = new CompatibilityDatabaseManager();
    const store = new PropertyGraphStore('@store');
    // Initialize database and store
    await db.initialize();
    await store.initialize();
    const program = new Command();
    program
        .name('shigrami')
        .description('Dependency Compatibility Database - Context7-like system for tracking package conflicts')
        .version('0.1.0');
    // MCP server command (Effect-TS version)
    program
        .command('mcp')
        .description('Start MCP server for AI assistant integration (Effect-TS version)')
        .option('--api-key <key>', 'API key for authentication (if required)')
        .action(async (options) => {
        const effect = startMCPServer(db);
        await Effect.runPromise(effect);
    });
    // Web dashboard command (Effect-TS version)
    program
        .command('dashboard')
        .description('Start web dashboard server (Effect-TS version)')
        .option('-p, --port <port>', 'Port to run the server on', '3000')
        .option('--host <host>', 'Host to bind to', 'localhost')
        .action(async (options) => {
        const port = parseInt(options.port);
        const host = options.host;
        const effect = setupWebServer(db, { port, host });
        await Effect.runPromise(effect);
    });
    // CLI commands for compatibility checking
    program
        .command('check <framework> [packages...]')
        .description('Check compatibility for a framework and packages')
        .option('-n, --node <version>', 'Node.js version to check')
        .action(async (framework, packages, options) => {
        const cli = new CLI(db);
        await cli.checkCompatibility(framework, packages, options);
    });
    // Search command
    program
        .command('search [query]')
        .description('Search compatibility database')
        .option('-f, --framework <name>', 'Filter by framework')
        .option('-s, --status <status>', 'Filter by status (pass, fail, warn)')
        .option('-l, --limit <number>', 'Limit number of results')
        .action(async (query, options) => {
        const cli = new CLI(db);
        await cli.searchCompatibility(query, options);
    });
    // Report command
    program
        .command('report')
        .description('Report a new compatibility issue')
        .option('-f, --framework <name>', 'Framework and version (e.g., next@15.0.0)')
        .option('-s, --status <status>', 'Status (pass, fail, warn)')
        .option('-r, --react <version>', 'React version')
        .option('--libs <json>', 'Additional libraries as JSON string (e.g., \'{"lib-a":"1.0.0"}\')')
        .option('-e, --error <message>', 'Error message')
        .option('-w, --workaround <message>', 'Workaround message')
        .action(async (options) => {
        const cli = new CLI(db);
        await cli.reportIssue(options);
    });
    program
        .command('resolve')
        .description('Resolve project dependencies using the shigrami resolver')
        .option('-p, --project-root <path>', 'Path to the project root directory')
        .action(async (options) => {
        const cli = new CLI(db);
        await cli.resolveDependencies(options);
    });
    // New command for incidence graph checking (Effect-TS version)
    program
        .command('check-graph-effect')
        .description('Check project compatibility using an incidence graph (Effect-TS version)')
        .option('-p, --project-root <path>', 'Path to the project root directory')
        .option('--rules-file <path>', 'Path to the compatibility rules JSON file')
        .action((options) => {
        const command = checkGraphCommand(options);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    // Keep the old command for comparison if needed, or remove it.
    program
        .command('check-graph')
        .description('Check project compatibility using an incidence graph rules file')
        .option('-p, --project-root <path>', 'Path to the project root directory')
        .option('--rules-file <path>', 'Path to the compatibility rules JSON file')
        .action(async (options) => {
        const cli = new CLI(db);
        await cli.checkIncidenceGraph(options);
    });
    // Search command (Effect-TS version)
    program
        .command('search-effect [query]')
        .description('Search compatibility database (Effect-TS version)')
        .option('-f, --framework <name>', 'Filter by framework')
        .option('-s, --status <status>', 'Filter by status (pass, fail, warn)')
        .option('-l, --limit <number>', 'Limit number of results')
        .action((query, options) => {
        const command = searchCommand(query, options);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    // Stats command (Effect-TS version)
    program
        .command('stats-effect')
        .description('Show database statistics (Effect-TS version)')
        .action(() => {
        const command = statsCommand();
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    // Export command (Effect-TS version)
    program
        .command('export-effect <outputFile>')
        .description('Export compatibility database to a file (Effect-TS version)')
        .action((outputFile) => {
        const command = exportCommand(outputFile);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    // Fetch compatibility data (Effect-TS version)
    program
        .command('fetch-compat <url>')
        .description('Fetch compatibility data from a remote source (Effect-TS version)')
        .action((url) => {
        const command = fetchCompatCommand(url);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    // Report compatibility issue (Effect-TS version)
    program
        .command('report-effect')
        .description('Report a new compatibility issue (Effect-TS version)')
        .option('-f, --framework <name>', 'Framework and version (e.g., next@15.0.0)')
        .option('-s, --status <status>', 'Status (pass, fail, warn)')
        .option('-r, --react <version>', 'React version')
        .option('--libs <json>', 'Additional libraries as JSON string (e.g., \'{"lib-a":"1.0.0"}\')')
        .option('-e, --error <message>', 'Error message')
        .option('-w, --workaround <message>', 'Workaround message')
        .action((options) => {
        const command = reportIssueCommand(options);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    // Resolve dependencies (Effect-TS version)
    program
        .command('resolve-effect')
        .description('Resolve project dependencies using the shigrami resolver (Effect-TS version)')
        .option('-p, --project-root <path>', 'Path to the project root directory')
        .action((options) => {
        const command = resolveDependenciesCommand(options);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    // Compute derivation hash (Effect-TS version)
    program
        .command('derivation-hash-effect')
        .description('Compute derivation hash for given parameters (Effect-TS version)')
        .option('-f, --framework <name>', 'Framework name')
        .option('-V, --framework-version <version>', 'Framework version')
        .option('-r, --react <version>', 'React version')
        .option('-n, --node <version>', 'Node.js version')
        .option('-p, --package-manager <manager>', 'Package manager')
        .option('-l, --libs <libs>', 'Libraries as JSON string')
        .action((options) => {
        const command = derivationHashCommand(options);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    // Nix Store operations (Effect-TS version)
    program
        .command('store-put-effect')
        .description('Store compatibility data in the Nix-like store (Effect-TS version)')
        .action(() => {
        const command = storePutCommand();
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    program
        .command('store-get-effect <hash>')
        .description('Retrieve compatibility data from store by derivation hash (Effect-TS version)')
        .action((hash) => {
        const command = storeGetCommand(hash);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    program
        .command('store-list-effect')
        .description('List all derivation hashes in store (Effect-TS version)')
        .action(() => {
        const command = storeListCommand();
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    program
        .command('store-stats-effect')
        .description('Show store statistics (Effect-TS version)')
        .action(() => {
        const command = storeStatsCommand();
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
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
        .command('export <outputFile>')
        .description('Export compatibility database to a file')
        .action(async (outputFile) => {
        const cli = new CLI(db);
        await cli.exportDatabase(outputFile);
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
        .action(async (hash) => {
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
        }
        else {
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
        .action(async (hash, options) => {
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
        .action(async (options) => {
        const builder = new DerivationBuilder();
        if (options.framework && options.frameworkVersion) {
            builder.framework(options.framework, options.frameworkVersion);
        }
        if (options.react)
            builder.react(options.react);
        if (options.node)
            builder.node(options.node);
        if (options.packageManager)
            builder.packageManager(options.packageManager);
        if (options.libs) {
            try {
                const libs = JSON.parse(options.libs);
                builder.libraries(libs);
            }
            catch (error) {
                console.error('❌ Invalid libs JSON');
                process.exit(1);
            }
        }
        try {
            const hash = builder.getHash();
            const derivation = builder.build();
            console.log(`🔢 Derivation Hash: ${hash}`);
            console.log(`📋 Derivation: ${JSON.stringify(derivation, null, 2)}`);
        }
        catch (error) {
            console.error('❌ Failed to create derivation:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    // New analyze command
    program
        .command('analyze')
        .description('Analyze project dependencies and generate a kaito experiment plan')
        .option('-p, --project-root <path>', 'Path to the project root directory')
        .option('-o, --output <file>', 'Output file for the experiment plan (JSON)')
        .action((options) => {
        const command = analyzeCommand(options);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    // Kaito commands
    const kaito = new Command('kaito')
        .description('Manage reproducible compatibility experiments');
    kaito
        .command('run')
        .description('Run a compatibility experiment')
        .option('--framework <pkg@ver>', 'Base framework')
        .option('--react <ver>', 'React version')
        .option('--lib <pkg@ver>', 'Additional library (can be used multiple times)')
        .option('-c, --config <path>', 'Experiment config file')
        .option('--report', 'Report result after running')
        .action((options) => {
        const command = kaitoRunCommand(options);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    kaito
        .command('new <name>')
        .description('Create a new experiment configuration file')
        .option('--framework <pkg@ver>', 'Base framework')
        .option('--react <ver>', 'React version')
        .option('--lib <pkg@ver>', 'Additional library')
        .action((name, options) => {
        const command = kaitoNewCommand(name, options);
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    kaito
        .command('report <experiment-hash>')
        .description('Report an experiment result to the database')
        .action((experimentHash) => {
        const command = kaitoReportCommand({ experimentHash });
        const runnable = Effect.provide(command, ShigaramiCliLive);
        NodeRuntime.runMain(runnable);
    });
    program.addCommand(kaito);
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
    try {
        await program.parseAsync(process.argv);
    }
    catch (error) {
        // This is a general catch-all. Specific errors are handled in CLI methods.
        if (error instanceof Error) {
            console.error('An unexpected error occurred:', error.message);
        }
        else {
            console.error('An unexpected error occurred:', error);
        }
        process.exit(1);
    }
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
main().catch(error => {
    if (error instanceof Error) {
        console.error('Failed to start CLI:', error.message);
    }
    else {
        console.error('Failed to start CLI:', error);
    }
    process.exit(1);
});
