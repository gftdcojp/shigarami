import { Effect, Layer, Console, Context } from 'effect';
import { NodeContext } from '@effect/platform-node';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

import { IncidenceGraphCheckerService } from '../services/incidence-graph-checker.js';
import type { IncidenceGraph } from '../types/incidence-graph.js';
import type { CLIOptions } from './index.js';
import type { CompatibilityDatabaseManager } from '../data/database.js';
import type { CompatibilityQuery } from '../types/compatibility.js';
import { CompatibilityDatabaseManager as DBManager } from '../data/database.js';
import type { NixStoreManager } from '../store/derivation.js';
import type { CompatibilityIssue } from '../types/compatibility.js';
import { NixStoreManager as NixManager, DerivationBuilder } from '../store/derivation.js';
import { ResolverService } from '../services/resolver.js';
import { GitHubStoreClient } from '../store/github-store.js';
import { DependencyAnalyzerService } from '../services/dependency-analyzer.js';

/**
 * Merkle DAG Edge: effect_cli -> incidence_graph_checker_service
 *
 * This file contains the Effect-TS implementation of the CLI commands.
 * Each command is represented as an Effect program, which allows for better
 * composition, dependency management, and error handling.
 */

/**
 * Define a service tag for IncidenceGraphCheckerService to be used with Effect's context.
 * This allows for easy dependency injection and testability.
 */
export class IncidenceGraphChecker extends Context.Tag("IncidenceGraphCheckerService")<
  IncidenceGraphChecker,
  IncidenceGraphCheckerService
>() {}

export class CompatibilityDatabase extends Context.Tag("CompatibilityDatabaseManager")<
  CompatibilityDatabase,
  CompatibilityDatabaseManager
>() {}

export class NixStore extends Context.Tag("NixStoreManager")<
  NixStore,
  NixStoreManager
>() {}

export class DependencyAnalyzer extends Context.Tag("DependencyAnalyzerService")<
  DependencyAnalyzer,
  DependencyAnalyzerService
>() {}

export class DependencyResolver extends Context.Tag("ResolverService")<
  DependencyResolver,
  ResolverService
>() {}

/**
 * An Effect layer that provides a live implementation of the IncidenceGraphCheckerService.
 */
const IncidenceGraphCheckerLive = Layer.succeed(
  IncidenceGraphChecker,
  new IncidenceGraphCheckerService(),
);

/**
 * Creates an Effect program for the 'check-graph' command.
 *
 * The program performs the following steps:
 * 1.  Resolves file paths for the rules file and package.json.
 * 2.  Reads both files using the FileSystem service.
 * 3.  Parses the JSON content.
 * 4.  Extracts dependencies from package.json.
 * 5.  Determines the environment key.
 * 6.  Runs the compatibility checker service.
 * 7.  Prints the violation report to the console.
 *
 * @param options - The CLI options provided to the command.
 * @returns An Effect program that, when executed, will perform the check.
 */
export const checkGraphCommand = (
  options: CLIOptions,
): Effect.Effect<void, Error, IncidenceGraphChecker> =>
  Effect.gen(function* (_) {
    const projectRoot = options.projectRoot || process.cwd();
    const rulesFile =
      options.rulesFile || path.join(projectRoot, 'compat-rules.json');

    yield* _(Console.log(`🔎 Running incidence graph check for project at: ${projectRoot}`));
    yield* _(Console.log(`   Using rules from: ${rulesFile}`));

    const checker = yield* _(IncidenceGraphChecker);

    // Read rules file
    const rulesContent = yield* _(
      Effect.tryPromise({
        try: () => fs.readFile(rulesFile, 'utf-8'),
        catch: (e) => new Error(`Failed to read rules file: ${e}`),
      }),
    );
    const graph: IncidenceGraph = yield* _(
      Effect.try({
        try: () => JSON.parse(rulesContent),
        catch: (e) => new Error(`Failed to parse rules file: ${e}`),
      }),
    );

    // Read package.json
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJsonContent = yield* _(
      Effect.tryPromise({
        try: () => fs.readFile(packageJsonPath, 'utf-8'),
        catch: (e) => new Error(`Failed to read package.json: ${e}`),
      }),
    );
    const packageJson = yield* _(
      Effect.try({
        try: () => JSON.parse(packageJsonContent),
        catch: (e) => new Error(`Failed to parse package.json: ${e}`),
      }),
    );

    const installedPackages = new Map<string, string>();
    const allDependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {}),
    };
    for (const [name, version] of Object.entries(allDependencies)) {
      installedPackages.set(name, version as string);
    }
    yield* _(Console.log(`   Found ${installedPackages.size} total dependencies.`));

    const envKey = 'env:node20-linux-x64-glibc-2.35'; // Placeholder
    yield* _(Console.log(`   Using environment key: ${envKey}`));

    const result = checker.check(graph, installedPackages, envKey);

    if (result.violations.length > 0) {
      yield* _(
        Console.error(
          `\n❌ Found ${result.violations.length} compatibility violation(s):`,
        ),
      );
      yield* _(Console.log(JSON.stringify(result, null, 2)));
      return yield* _(Effect.fail(new Error(`${result.violations.length} violations found`)));
    }

    yield* _(Console.log('\n✅ No compatibility violations found.'));
  });

/**
 * Creates an Effect program for the 'stats' command.
 *
 * The program performs the following steps:
 * 1. Retrieves the database statistics.
 * 2. Displays the statistics in a formatted way.
 *
 * @returns An Effect program that displays database statistics.
 */
export const statsCommand = (): Effect.Effect<void, never, CompatibilityDatabase> =>
  Effect.gen(function* (_) {
    const db = yield* _(CompatibilityDatabase);
    const stats = db.getStats();

    yield* _(Console.log('📊 DepCompat Database Statistics\n'));

    yield* _(Console.log(`Total Issues:     ${stats.total}`));
    yield* _(Console.log(`Verified Issues:  ${stats.verified}`));
    yield* _(Console.log(`Failed:           ${stats.failed}`));
    yield* _(Console.log(`Warnings:         ${stats.warned}`));
    yield* _(Console.log(`Passed:           ${stats.passed}`));
    yield* _(Console.log());

    if (stats.frameworks.length > 0) {
      yield* _(Console.log('Frameworks:'));
      for (const framework of stats.frameworks) {
        yield* _(Console.log(`  - ${framework}`));
      }
      yield* _(Console.log());
    }

    yield* _(Console.log(`Last Updated:     ${new Date(stats.lastUpdated).toLocaleString()}`));
    yield* _(Console.log(`Database Hash:    ${stats.merkleRoot.substring(0, 16)}...`));

    const successRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    yield* _(Console.log(`Success Rate:     ${successRate.toFixed(1)}%`));
  });

/**
 * Creates an Effect program for the 'search' command.
 *
 * The program performs the following steps:
 * 1. Builds a query from the provided options.
 * 2. Searches the database for matching issues.
 * 3. Displays the results in a formatted table.
 *
 * @param queryString - Optional search query string.
 * @param options - CLI options for filtering.
 * @returns An Effect program that searches and displays compatibility issues.
 */
export const searchCommand = (
  queryString: string | undefined,
  options: CLIOptions,
): Effect.Effect<void, Error, CompatibilityDatabase> =>
  Effect.gen(function* (_) {
    const db = yield* _(CompatibilityDatabase);

    const query: CompatibilityQuery = {
      limit: parseInt(options.limit || '10'),
    };

    if (options.framework) query.framework = options.framework;
    if (options.status) query.status = options.status;

    const issues = yield* _(
      Effect.tryPromise({
        try: () => db.queryIssues(query),
        catch: (e) => new Error(`Database query failed: ${e}`),
      }),
    );

    if (issues.length === 0) {
      yield* _(Console.log('No compatibility issues found.'));
      return;
    }

    // Display results in a table format
    yield* _(Console.log('Framework | Version | React | Status | Error/Workaround'));
    yield* _(Console.log('----------|---------|-------|--------|------------------'));

    for (const issue of issues) {
      const framework = issue.framework;
      const version = issue.version;
      const react = issue.react || '-';
      const status = issue.status.toUpperCase();
      const error = (issue.error?.substring(0, 50) ?? '-') +
        (issue.error && issue.error.length > 50 ? '...' : '');

      yield* _(Console.log(`${framework} | ${version} | ${react} | ${status} | ${error}`));
    }

    yield* _(Console.log(`\nShowing ${issues.length} results`));
  });

/**
 * Creates an Effect program for the 'export' command.
 *
 * The program performs the following steps:
 * 1. Exports the entire database to JSON.
 * 2. Writes the data to the specified output file.
 * 3. Reports the export statistics.
 *
 * @param outputFile - The path to the output file.
 * @returns An Effect program that exports the database to a file.
 */
export const exportCommand = (
  outputFile: string,
): Effect.Effect<void, Error, CompatibilityDatabase> =>
  Effect.gen(function* (_) {
    const db = yield* _(CompatibilityDatabase);

    // Export database
    const data = yield* _(
      Effect.tryPromise({
        try: () => db.exportDatabase(),
        catch: (e) => new Error(`Database export failed: ${e}`),
      }),
    );

    // Write to file
    const jsonContent = JSON.stringify(data, null, 2);
    yield* _(
      Effect.tryPromise({
        try: () => fs.writeFile(outputFile, jsonContent, 'utf-8'),
        catch: (e) => new Error(`Failed to write file: ${e}`),
      }),
    );

    yield* _(Console.log(`✅ Database exported to ${outputFile}`));
    yield* _(Console.log(`   ${data.issues.length} issues exported`));
    yield* _(Console.log(`   Schema version: ${data.schemaVersion}`));
    yield* _(Console.log(`   Last updated: ${new Date(data.lastUpdated).toLocaleString()}`));
  });

/**
 * Creates an Effect program for the 'fetch-compat' command.
 *
 * The program performs the following steps:
 * 1. Makes an HTTP request to fetch compatibility data from a remote source.
 * 2. Parses the JSON response.
 * 3. Displays the fetched data.
 *
 * @param url - The URL to fetch compatibility data from.
 * @returns An Effect program that fetches and displays remote compatibility data.
 */
export const fetchCompatCommand = (
  url: string,
): Effect.Effect<void, Error, never> =>
  Effect.gen(function* (_) {
    yield* _(Console.log(`🌐 Fetching compatibility data from: ${url}`));

    // Make HTTP request using Node.js fetch
    const response = yield* _(
      Effect.tryPromise({
        try: () => fetch(url),
        catch: (e) => new Error(`HTTP request failed: ${e}`),
      }),
    );

    if (!response.ok) {
      return yield* _(Effect.fail(new Error(`HTTP ${response.status}: ${response.statusText}`)));
    }

    const data = yield* _(
      Effect.tryPromise({
        try: () => response.json(),
        catch: (e) => new Error(`Failed to parse JSON response: ${e}`),
      }),
    );

    // Parse and display data
    const parsedData = yield* _(
      Effect.try({
        try: () => data as any,
        catch: (e) => new Error(`Failed to parse response data: ${e}`),
      }),
    );

    if (Array.isArray(parsedData)) {
      yield* _(Console.log(`✅ Fetched ${parsedData.length} compatibility issues`));
      for (let i = 0; i < Math.min(5, parsedData.length); i++) {
        const issue = parsedData[i];
        yield* _(Console.log(`   - ${issue.framework}@${issue.version}: ${issue.status}`));
      }
      if (parsedData.length > 5) {
        yield* _(Console.log(`   ... and ${parsedData.length - 5} more`));
      }
    } else {
      yield* _(Console.log(`✅ Fetched data: ${JSON.stringify(parsedData, null, 2)}`));
    }
  });

/**
 * Creates an Effect program for the 'store-put-effect' command.
 *
 * The program performs the following steps:
 * 1. Retrieves compatibility issues from the database.
 * 2. Stores them in Nix Store-like fashion based on derivation hash.
 * 3. Returns the derivation hash.
 *
 * @returns An Effect program that stores compatibility data in Nix Store.
 */
export const storePutCommand = (): Effect.Effect<void, Error, CompatibilityDatabase | NixStore> =>
  Effect.gen(function* (_) {
    const db = yield* _(CompatibilityDatabase);
    const store = yield* _(NixStore);

    yield* _(Console.log('📦 Storing compatibility data...'));

    const issues = yield* _(
      Effect.tryPromise({
        try: () => db.queryIssues({ limit: 1000 }),
        catch: (e) => new Error(`Failed to query issues: ${e}`),
      }),
    );

    // Create a derivation for the compatibility data
    const derivation = {
      framework: { name: 'shigrami', version: '1.0.0' },
      libraries: {},
      testScript: 'compatibility-data-collection',
      environment: { os: 'any', timeout: 0 },
    };

    // Create a derivation result containing the compatibility issues
    const result = {
      status: 'pass' as const,
      duration: 0,
      environment: {
        nodeVersion: process.version,
        os: process.platform,
        arch: process.arch,
        timestamp: new Date().toISOString(),
      },
      verified: true,
      compatibilityData: issues,
    };

    const hash = yield* _(
      Effect.tryPromise({
        try: () => store.storeResult(derivation, result),
        catch: (e) => new Error(`Failed to store data: ${e}`),
      }),
    );

    yield* _(Console.log(`✅ Stored with derivation hash: ${hash}`));
  });

/**
 * Creates an Effect program for the 'store-get-effect' command.
 *
 * The program performs the following steps:
 * 1. Retrieves compatibility data from Nix Store by hash.
 * 2. Displays statistics about the retrieved data.
 *
 * @param hash - The derivation hash to retrieve.
 * @returns An Effect program that retrieves and displays stored data.
 */
export const storeGetCommand = (
  hash: string,
): Effect.Effect<void, Error, NixStore> =>
  Effect.gen(function* (_) {
    const store = yield* _(NixStore);

    yield* _(Console.log(`🔍 Retrieving data for hash: ${hash}`));

    const entry = yield* _(
      Effect.tryPromise({
        try: () => store.getResult(hash),
        catch: (e) => new Error(`Failed to retrieve data: ${e}`),
      }),
    );

    if (!entry) {
      yield* _(Console.log('❌ No data found for this hash'));
      return;
    }

    const data = (entry.result as any).compatibilityData as CompatibilityIssue[];
    if (!data || !Array.isArray(data)) {
      yield* _(Console.log('❌ Invalid data format'));
      return;
    }

    yield* _(Console.log(`✅ Found ${data.length} compatibility issues`));
    yield* _(Console.log(`📊 Status breakdown:`));

    const stats = data.reduce((acc, issue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    yield* _(Effect.forEach(
      Object.entries(stats),
      ([status, count]) => Console.log(`   ${status.toUpperCase()}: ${count}`),
      { concurrency: 1 }
    ));
  });

/**
 * Creates an Effect program for the 'store-list-effect' command.
 *
 * The program performs the following steps:
 * 1. Lists all derivation hashes in the Nix Store.
 * 2. Displays the total count and first few hashes.
 *
 * @returns An Effect program that lists stored derivations.
 */
export const storeListCommand = (): Effect.Effect<void, Error, NixStore> =>
  Effect.gen(function* (_) {
    const store = yield* _(NixStore);

    const hashes = yield* _(
      Effect.tryPromise({
        try: () => store.listDerivations(),
        catch: (e) => new Error(`Failed to list derivations: ${e}`),
      }),
    );

    yield* _(Console.log(`📋 Stored derivations: ${hashes.length}`));
    yield* _(Effect.forEach(
      hashes.slice(0, 10),
      (hash) => Console.log(`   ${hash}`),
      { concurrency: 1 }
    ));

    if (hashes.length > 10) {
      yield* _(Console.log(`   ... and ${hashes.length - 10} more`));
    }
  });

/**
 * Creates an Effect program for the 'store-stats-effect' command.
 *
 * The program performs the following steps:
 * 1. Retrieves Nix Store statistics.
 * 2. Displays detailed statistics about the store.
 *
 * @returns An Effect program that displays store statistics.
 */
export const storeStatsCommand = (): Effect.Effect<void, Error, NixStore> =>
  Effect.gen(function* (_) {
    const store = yield* _(NixStore);

    const stats = yield* _(
      Effect.tryPromise({
        try: () => store.getStatistics(),
        catch: (e) => new Error(`Failed to get store stats: ${e}`),
      }),
    );

    yield* _(Console.log('📊 Nix Store Statistics:'));
    yield* _(Console.log(`   Total entries: ${stats.totalEntries}`));
    yield* _(Console.log(`   Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`));
    yield* _(Console.log(`   Cache hits: ${stats.cacheHits}`));
    yield* _(Console.log(`   Average entry size: ${(stats.averageEntrySize / 1024).toFixed(2)} KB`));

    if (stats.oldestEntry) {
      yield* _(Console.log(`   Oldest entry: ${new Date(stats.oldestEntry).toLocaleDateString()}`));
      yield* _(Console.log(`   Newest entry: ${new Date(stats.newestEntry).toLocaleDateString()}`));
    }
  });

/**
 * A ready-to-run layer that provides all the necessary services for the commands in this file.
 * This wires up the live implementations for the services.
 */
const CompatibilityDatabaseLive = Layer.effect(
  CompatibilityDatabase,
  Effect.gen(function* (_) {
    const db = new DBManager('./data');
    yield* _(Effect.tryPromise({
      try: () => db.initialize(),
      catch: (e) => new Error(`Database initialization failed: ${e}`),
    }));
    return db;
  }),
);

const NixStoreLive = Layer.effect(
  NixStore,
  Effect.gen(function* (_) {
    const store = new NixManager('@store');
    yield* _(Effect.tryPromise({
      try: () => store.initialize(),
      catch: (e) => new Error(`Nix Store initialization failed: ${e}`),
    }));
    return store;
  }),
);

const DependencyAnalyzerLive = Layer.succeed(
  DependencyAnalyzer,
  new DependencyAnalyzerService(),
);

/**
 * Creates an Effect program for the 'report-effect' command.
 *
 * The program performs the following steps:
 * 1. Validate required options (framework, status)
 * 2. Parse framework and version
 * 3. Parse additional libraries JSON
 * 4. Create CompatibilityIssue object
 * 5. Save to database
 *
 * @param options - CLI options for the report
 * @returns An Effect program that reports a compatibility issue
 */
export const reportIssueCommand = (
  options: CLIOptions,
): Effect.Effect<void, Error, CompatibilityDatabase> =>
  Effect.gen(function* (_) {
    // Validate required options
    if (!options.framework) {
      yield* _(Effect.fail(new Error('Framework is required (use -f or --framework)')));
    }

    if (!options.status) {
      yield* _(Effect.fail(new Error('Status is required (use -s or --status)')));
    }

    // Parse framework and version
    const [framework, version] = options.framework!.includes('@')
      ? options.framework!.split('@', 2)
      : [options.framework!, undefined];

    if (!version) {
      yield* _(Effect.fail(new Error('Framework version must be specified (e.g., next@15.0.0)')));
    }

    // Parse additional libraries
    let libs: Record<string, string> = {};
    if (options.libs) {
      if (typeof options.libs === 'string') {
        try {
          // Assuming libs can be a comma-separated string of "name@version" pairs
          // or a JSON string. Prioritize comma-separated for CLI simplicity.
          if (options.libs.includes('@') || options.libs.includes(',')) {
            options.libs.split(',').forEach(lib => {
              const parts = lib.trim().split('@');
              if (parts.length === 2) {
                libs[parts[0]] = parts[1];
              }
            });
          } else {
            // Fallback to JSON parsing if it's not a simple list
            libs = JSON.parse(options.libs);
          }
        } catch (e) {
          yield* _(Effect.fail(new Error(`Invalid libs format: ${e}`)));
        }
      } else if (typeof options.libs === 'object') {
        libs = options.libs;
      } else {
        yield* _(Effect.fail(new Error(`Invalid libs format: Expected string or object`)));
      }
    }

    const db = yield* _(CompatibilityDatabase);

    // Generate ID beforehand (same logic as database manager)
    const components = [
      framework,
      version!,
      options.react,
      options.node,
      options.packageManager,
    ].filter(Boolean);

    if (Object.keys(libs).length > 0) {
      components.push(...Object.entries(libs).map(([k, v]) => `${k}@${v}`));
    }

    const hashInput = components.join('|');
    const id = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);

    // Create issue object with generated ID
    const issueData = {
      id,
      framework,
      version: version!,
      react: options.react,
      node: options.node,
      packageManager: options.packageManager,
      libs: Object.keys(libs).length > 0 ? libs : undefined,
      status: options.status!,
      error: options.error,
      workaround: options.workaround,
      reportedAt: new Date().toISOString(),
      verified: options.verified || false,
      source: 'manual' as const,
    };

    // Save to database
    yield* _(
      Effect.tryPromise({
        try: () => db.saveIssue(issueData),
        catch: (e) => new Error(`Failed to save issue: ${e}`),
      }),
    );

    yield* _(Console.log('✅ Compatibility issue reported successfully!'));
    yield* _(Console.log(`   Issue ID: ${id}`));
  });

/**
 * Creates an Effect program for the 'resolve-effect' command.
 *
 * The program performs the following steps:
 * 1. Initialize GitHub store client
 * 2. Create resolver service
 * 3. Resolve project dependencies
 * 4. Report results
 *
 * @param options - CLI options for the resolution
 * @returns An Effect program that resolves project dependencies
 */
export const resolveDependenciesCommand = (
  options: CLIOptions,
): Effect.Effect<void, Error, never> =>
  Effect.gen(function* (_) {
    const projectRoot = options.projectRoot || process.cwd();
    yield* _(Console.log(`🚀 Starting dependency resolution for project at: ${projectRoot}`));

    // Initialize store client (placeholder configuration)
    const storeClient = new GitHubStoreClient({
      owner: 'junkawasaki', // Replace with the actual store owner
      repo: 'dep-store',      // Replace with the actual store repo
    });

    yield* _(
      Effect.tryPromise({
        try: () => storeClient.initialize(),
        catch: (e) => new Error(`Failed to initialize store client: ${e}`),
      }),
    );

    // Create resolver service
    const resolver = new ResolverService(storeClient);

    // Resolve dependencies
    const lockFile = yield* _(
      Effect.tryPromise({
        try: () => resolver.resolveProject(projectRoot),
        catch: (e) => new Error(`Dependency resolution failed: ${e}`),
      }),
    );

    yield* _(Console.log('✅ Resolution successful!'));
    yield* _(Console.log(`   - Resolved ${Object.keys(lockFile.dependencies).length} dependencies.`));
    // Further steps would involve fetching and linking packages.
  });

/**
 * Creates an Effect program for the 'derivation-hash-effect' command.
 *
 * The program performs the following steps:
 * 1. Parse command line options to build a derivation
 * 2. Compute the derivation hash
 * 3. Display the hash and derivation details
 *
 * @param options - CLI options for derivation parameters
 * @returns An Effect program that computes and displays derivation hash
 */
export const derivationHashCommand = (options: any): Effect.Effect<void, Error, never> =>
  Effect.gen(function* (_) {
    const builder = new DerivationBuilder();

    // Build derivation from options
    if (options.framework && options.frameworkVersion) {
      builder.framework(options.framework, options.frameworkVersion);
    }
    if (options.react) builder.react(options.react);
    if (options.node) builder.node(options.node);
    if (options.packageManager) builder.packageManager(options.packageManager);
    if (options.libs) {
      const libs = yield* _(
        Effect.try({
          try: () => JSON.parse(options.libs),
          catch: (e) => new Error(`Invalid libs JSON: ${e}`),
        }),
      );
      builder.libraries(libs);
    }

    // Compute hash and build derivation
    const hash = builder.getHash();
    const derivation = builder.build();

    yield* _(Console.log(`🔢 Derivation Hash: ${hash}`));
    yield* _(Console.log(`📋 Derivation: ${JSON.stringify(derivation, null, 2)}`));
  });

export const analyzeCommand = (options: CLIOptions): Effect.Effect<void, Error, DependencyAnalyzer> =>
  Effect.gen(function* (_) {
    const projectRoot = options.projectRoot || process.cwd();
    const analyzer = yield* _(DependencyAnalyzer);

    // Read package.json to get direct dependencies for context
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJsonContent = yield* _(Effect.tryPromise({
      try: () => fs.readFile(packageJsonPath, 'utf-8'),
      catch: (e) => new Error(`Failed to read package.json: ${e}`),
    }));
    const packageJson = JSON.parse(packageJsonContent);

    const scores = yield* _(analyzer.analyze(projectRoot));

    yield* _(Console.log('\n📊 Dependency Analysis Results:\n'));
    yield* _(Console.log('Top 5 High-Impact Packages (Tier 1):'));
    scores.slice(0, 5).forEach(s => {
        Console.log(`   - ${s.name} (Score: ${s.score})`);
    });

    const plan = analyzer.generatePlan(scores, packageJson);

    yield* _(Console.log('\n🧪 Recommended Kaito Experiments:\n'));

    if (plan.tier1.length > 0) {
      yield* _(Console.log('Tier 1: Foundational Pairs'));
      plan.tier1.forEach(args => {
        Console.log(`  - shigrami kaito run ${args.join(' ')}`);
      });
    }

    if (plan.tier2.length > 0) {
      yield* _(Console.log('\nTier 2: Core Feature Blocks'));
      plan.tier2.forEach(args => {
        Console.log(`  - shigrami kaito run ${args.join(' ')}`);
      });
    }

    if (options.output) {
      const outputPath = path.resolve(options.output);
      yield* _(Effect.tryPromise({
        try: () => fs.writeFile(outputPath, JSON.stringify(plan, null, 2)),
        catch: (e) => new Error(`Failed to write experiment plan to ${outputPath}: ${e}`),
      }));
      yield* _(Console.log(`\n✅ Experiment plan saved to: ${outputPath}`));
    }
  });

export const ShigaramiCliLive = IncidenceGraphCheckerLive.pipe(
  Layer.provideMerge(CompatibilityDatabaseLive),
  Layer.provideMerge(NixStoreLive),
  Layer.provideMerge(DependencyAnalyzerLive), // Add new service
  Layer.provide(NodeContext.layer),
);
