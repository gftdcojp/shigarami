import { Effect, Console } from 'effect';
import * as os from 'os';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as child_process from 'child_process';
import { reportIssueCommand } from './commands.js';
import type { CompatibilityIssueSource } from '../types/compatibility.js';
import type { CLIOptions } from './index.js';
import type { KaitoConfig, KaitoRunResult } from './kaito.js';
import { parsePkg } from './kaito.js';
import { CompatibilityDatabase } from './commands.js';

// --- Kaito Command Implementations ---

export const kaitoRunCommand = (options: any): Effect.Effect<void, Error, CompatibilityDatabase> =>
  Effect.gen(function* (_) {
    const startTime = Date.now();

    const shigramiDir = path.join(os.homedir(), '.shigarami');
    yield* _(Effect.tryPromise(() => fs.mkdir(shigramiDir, { recursive: true })));

    let config: KaitoConfig;
    if (options.config) {
        const configFileContent = yield* _(Effect.tryPromise(() => fs.readFile(path.resolve(options.config), 'utf-8')));
        config = JSON.parse(configFileContent);
    } else {
        const libs = options.lib ? (Array.isArray(options.lib) ? options.lib : [options.lib]).reduce((acc: Record<string, string>, lib: string) => {
            const { name, version } = parsePkg(lib);
            acc[name] = version;
            return acc;
        }, {}) : {};

        config = {
            name: `Experiment for ${options.framework}`,
            template: options.template || 'nextjs-app',
            environment: { node: '20.x', nodePackageManager: 'npm@10.x' },
            dependencies: {
                framework: options.framework,
                ...(options.react && { react: options.react }),
                libs,
            },
            script: options.script || 'build',
        };
    }

    const experimentHash = crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex').substring(0, 16);
    const experimentDir = path.join(shigramiDir, 'cache', experimentHash);

    yield* _(Console.log(`🧪 Starting experiment: ${config.name} (${experimentHash})`));
    yield* _(Console.log(`   Location: ${experimentDir}`));

    // Clean up existing experiment
    yield* _(Effect.tryPromise(() => fs.rm(experimentDir, { recursive: true, force: true }))
      .pipe(Effect.catchAll(() => Effect.succeed(undefined)))); // Ignore if dir doesn't exist or is already empty

    yield* _(Effect.tryPromise(() => fs.mkdir(experimentDir, { recursive: true })));

    const { name: frameworkName, version: frameworkVersion } = parsePkg(config.dependencies.framework);

    const deps: Record<string, string> = { [frameworkName]: frameworkVersion };
    if (config.dependencies.react) {
      deps['react'] = config.dependencies.react;
      deps['@types/react'] = config.dependencies.react;
    }
    if (config.dependencies.libs) {
      Object.assign(deps, config.dependencies.libs);
    }

    const packageJson = {
      name: `kaito-experiment-${experimentHash}`,
      version: '0.1.0',
      private: true,
      scripts: { [config.script]: `echo "Running build script..." && exit 0` },
      dependencies: deps
    };

    yield* _(Effect.tryPromise(() => fs.writeFile(
      path.join(experimentDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    )));

    yield* _(Console.log(`   Installing dependencies...`));

    const runExternalCommand = (cmd: string, args: string[] = []): Promise<{stdout: string, stderr: string, exitCode: number}> => {
      return new Promise((resolve) => {
        const result = child_process.spawnSync(cmd, args, {
          cwd: experimentDir,
          encoding: 'utf-8',
        });
        resolve({
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: result.status || 0,
        });
      });
    };

    const installOutput = yield* _(Effect.tryPromise(() => runExternalCommand('npm', ['install'])));
    yield* _(Console.log(`   Running script: ${config.script}...`));

    let buildOutput = { stdout: "", stderr: "", exitCode: 0 };
    if (installOutput.exitCode === 0) {
      buildOutput = yield* _(Effect.tryPromise(() => runExternalCommand('npm', ['run', config.script])));
    } else {
      yield* _(Console.log(`   Skipping script due to installation failure.`));
    }

    let status: 'pass' | 'fail' | 'warn' = 'fail';
    if (installOutput.exitCode === 0 && buildOutput.exitCode === 0) {
      status = 'pass';
    }

    const duration = (Date.now() - startTime) / 1000;

    const result: KaitoRunResult = {
      experimentHash,
      config,
      status,
      logs: { install: installOutput, build: buildOutput },
      duration,
    };

    const resultsDir = path.join(shigramiDir, 'results');
    yield* _(Effect.tryPromise(() => fs.mkdir(resultsDir, { recursive: true })));
    const resultPath = path.join(resultsDir, `${experimentHash}.json`);
    yield* _(Effect.tryPromise(() => fs.writeFile(resultPath, JSON.stringify(result, null, 2))));

    yield* _(Console.log(`✅ Experiment finished in ${duration.toFixed(2)}s. Status: ${status.toUpperCase()}`));
    yield* _(Console.log(`   Result saved to: ${resultPath}`));

    if(options.report) {
        yield* _(Console.log(`\nTransitioning to report...`));
        yield* _(kaitoReportCommand({ experimentHash: result.experimentHash }));
    }
  });

export const kaitoNewCommand = (name: string, options: any): Effect.Effect<void, Error> =>
  Effect.gen(function* (_) {
    const libs = options.lib ? (Array.isArray(options.lib) ? options.lib : [options.lib]).reduce((acc: Record<string, string>, lib: string) => {
        const { name, version } = parsePkg(lib);
        acc[name] = version;
        return acc;
    }, {}) : {};

    const config: KaitoConfig = {
      name,
      template: options.template || 'nextjs-app',
      environment: { node: '20.x', nodePackageManager: 'npm@10.x' },
      dependencies: {
        framework: options.framework,
        ...(options.react && { react: options.react }),
        libs,
      },
      script: options.script || 'build',
    };

    const fileName = `${name.replace(/\s+/g, '-')}.kaito.json`;
    const filePath = path.resolve(process.cwd(), fileName);

    yield* _(Effect.tryPromise(() => fs.writeFile(filePath, JSON.stringify(config, null, 2))));
    yield* _(Console.log(`✅ Created experiment file: ${filePath}`));
  });

export const kaitoReportCommand = (options: { experimentHash: string }): Effect.Effect<void, Error, CompatibilityDatabase> =>
  Effect.gen(function* (_) {
    const shigramiDir = path.join(os.homedir(), '.shigarami');
    const resultPath = path.join(shigramiDir, 'results', `${options.experimentHash}.json`);

    const resultString = yield* _(Effect.tryPromise(() => fs.readFile(resultPath, 'utf-8')));
    const result: KaitoRunResult = JSON.parse(resultString);

    yield* _(Console.log(`\n📝 Preparing report for experiment: ${result.config.name}`));
    yield* _(Console.log(`For now, this is a simplified, non-interactive step.`));

    const error = result.logs.install.exitCode !== 0
      ? result.logs.install.stderr
      : result.logs.build.stderr;

    const frameworkPkg = parsePkg(result.config.dependencies.framework);

    const reportOptions: CLIOptions = {
      framework: `${frameworkPkg.name}@${frameworkPkg.version}`,
      react: result.config.dependencies.react,
      libs: result.config.dependencies.libs ? Object.entries(result.config.dependencies.libs).map(([k, v]) => `${k}@${v}`).join(',') : undefined,
      status: result.status,
      error: error.substring(0, 500),
      workaround: "No workaround provided in this automated report.",
      source: 'manual' as CompatibilityIssueSource,
    };

    yield* _(Console.log(`\nSubmitting report to shigarami database...`));
    yield* _(reportIssueCommand(reportOptions));
  });
