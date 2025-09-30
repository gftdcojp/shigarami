/**
 * Dependency Analyzer Service for Shigarami
 *
 * Analyzes a project's dependency graph to determine the importance of each package
 * and suggests a prioritized list of compatibility experiments to run with `kaito`.
 */

import { Effect, Console } from 'effect';
import * as child_process from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface NpmLsDependency {
  version?: string;
  resolved?: string;
  dependencies?: Record<string, NpmLsDependency>;
}

interface PackageScore {
  name: string;
  score: number;
  inDegree: number;
}

export interface ExperimentPlan {
  tier1: string[][];
  tier2: string[][];
  tier3: string[][];
}

export class DependencyAnalyzerService {
  /**
   * Analyzes the dependencies of a project at the given root path.
   * @param projectRoot - The root path of the project to analyze.
   * @returns An Effect that resolves to a list of package scores.
   */
  public analyze(projectRoot: string): Effect.Effect<PackageScore[], Error> {
    return Effect.gen(function* (_this) {
      yield* _this(Console.log(`🔍 Analyzing dependencies for project at: ${projectRoot}`));

      // 1. Get dependency tree using `npm ls --json`
      const depTree = yield* _this(Effect.tryPromise({
        try: () => this.getDependencyTree(projectRoot),
        catch: (e) => new Error(`Failed to get dependency tree: ${e}`),
      }));

      // 2. Build a flat map of all dependencies and calculate in-degree
      const inDegreeMap = new Map<string, number>();
      this.traverseDeps(depTree, (depName: string) => {
        inDegreeMap.set(depName, (inDegreeMap.get(depName) || 0) + 1);
      });

      // 3. Score packages (currently just based on in-degree)
      const scores: PackageScore[] = Array.from(inDegreeMap.entries()).map(([name, inDegree]) => ({
        name,
        inDegree,
        score: inDegree, // Simple scoring for now
      }));

      // 4. Sort by score
      scores.sort((a, b) => b.score - a.score);

      yield* _this(Console.log(`✅ Analysis complete. Found ${scores.length} unique dependencies.`));

      return scores;
    }.bind(this));
  }

  /**
   * Generates a prioritized experiment plan based on package scores.
   * @param scores - A sorted list of package scores.
   * @param projectPackageJson - The parsed package.json of the root project.
   * @returns An experiment plan with Tier 1, 2, and 3 experiments.
   */
  public generatePlan(scores: PackageScore[], projectPackageJson: any): ExperimentPlan {
    const tier1Packages = scores.slice(0, 5).map(s => s.name);
    const coreFramework = projectPackageJson.dependencies?.next ? 'next' : (projectPackageJson.dependencies?.react ? 'react' : undefined);
    const reactVersion = projectPackageJson.dependencies?.react;

    const plan: ExperimentPlan = {
      tier1: [],
      tier2: [],
      tier3: [],
    };

    if (coreFramework) {
        const frameworkVersion = projectPackageJson.dependencies[coreFramework];

        // Tier 1: Core framework and React
        if (reactVersion) {
            plan.tier1.push([`--framework ${coreFramework}@${frameworkVersion}`, `--react ${reactVersion}`]);
        }

        // Tier 2: Core framework + high-impact packages
        tier1Packages.filter(p => p !== coreFramework && p !== 'react').slice(0, 2).forEach(pkg => {
            const pkgVersion = projectPackageJson.dependencies[pkg] || projectPackageJson.devDependencies[pkg];
            if (pkgVersion) {
                plan.tier2.push([`--framework ${coreFramework}@${frameworkVersion}`, `--react ${reactVersion}`, `--lib ${pkg}@${pkgVersion}`]);
            }
        });
    }

    return plan;
  }

  private async getDependencyTree(cwd: string): Promise<NpmLsDependency> {
    return new Promise((resolve, reject) => {
      child_process.exec('npm ls --json', { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
        // npm ls returns a non-zero exit code if there are unmet peer dependencies,
        // which we can ignore for the purpose of building the graph.
        if (error && error.code && error.code > 1) {
          return reject(error);
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          // Sometimes npm ls outputs warnings before the JSON. We can try to find the JSON.
          const jsonStartIndex = stdout.indexOf('{');
          if (jsonStartIndex > -1) {
            try {
              resolve(JSON.parse(stdout.substring(jsonStartIndex)));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(parseError);
          }
        }
      });
    });
  }

  private traverseDeps(node: NpmLsDependency, visitor: (depName: string) => void) {
    if (!node.dependencies) return;

    for (const depName in node.dependencies) {
      visitor(depName);
      this.traverseDeps(node.dependencies[depName], visitor);
    }
  }
}
