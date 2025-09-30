import { Effect, Layer, Console, Context } from 'effect';
import { NodeContext } from '@effect/platform-node';
import path from 'path';
import fs from 'fs/promises';

import { IncidenceGraphCheckerService } from '../services/incidence-graph-checker.js';
import type { IncidenceGraph } from '../types/incidence-graph.js';
import type { CLIOptions } from './index.js';
import type { CompatibilityDatabaseManager } from '../data/database.js';
import type { CompatibilityQuery } from '../types/compatibility.js';
import { CompatibilityDatabaseManager as DBManager } from '../data/database.js';

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

export const ShigaramiCliLive = IncidenceGraphCheckerLive.pipe(
  Layer.provideMerge(CompatibilityDatabaseLive),
  Layer.provide(NodeContext.layer),
);
