import { Effect, Layer, Console, Context } from 'effect';
import { NodeContext } from '@effect/platform-node';
import { FileSystem } from '@effect/platform';
import path from 'path';

import { IncidenceGraphCheckerService } from '../services/incidence-graph-checker.js';
import type { IncidenceGraph } from '../types/incidence-graph.js';
import type { CLIOptions } from './index.js';

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
 *          The Effect requires FileSystem and IncidenceGraphCheckerService dependencies.
 */
export const checkGraphCommand = (
  options: CLIOptions,
): Effect.Effect<void, Error, FileSystem | IncidenceGraphChecker> => {
  const projectRoot = options.projectRoot || process.cwd();
  const rulesFile =
    options.rulesFile || path.join(projectRoot, 'compat-rules.json');

  return Effect.gen(function* (_) {
    const fs = yield* _(FileSystem);
    const checker = yield* _(IncidenceGraphChecker);

    yield* _(Console.log(`🔎 Running incidence graph check for project at: ${projectRoot}`));
    yield* _(Console.log(`   Using rules from: ${rulesFile}`));

    const rulesContent = yield* _(fs.readFileString(rulesFile));
    const graph: IncidenceGraph = JSON.parse(rulesContent);

    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJsonContent = yield* _(fs.readFileString(packageJsonPath));
    const packageJson = JSON.parse(packageJsonContent);

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
};

/**
 * A ready-to-run layer that provides all the necessary services for the commands in this file.
 * This wires up the live implementations for the services.
 */
export const ShigaramiCliLive = IncidenceGraphCheckerLive.pipe(
  Layer.provide(NodeContext.layer),
);
