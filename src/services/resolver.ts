import fs from 'fs/promises';
import path from 'path';
import type { GitHubStoreClient } from '../store/github-store.js';
import type { LockFile, ResolutionEnvironment, ResolvedDependency } from '../types/resolver.js';

/**
 * Service responsible for resolving project dependencies.
 * It orchestrates the process of reading package.json, querying the
 * GitHub store, and generating a lock file.
 */
export class ResolverService {
  constructor(private readonly storeClient: GitHubStoreClient) {}

  /**
   * Resolves dependencies for a project located at a given root path.
   * @param projectRoot - The root directory of the project, containing a package.json.
   * @returns The generated lock file.
   */
  async resolveProject(projectRoot: string): Promise<LockFile> {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = await this.readPackageJson(packageJsonPath);

    console.log(`Resolving dependencies for ${packageJson.name}...`);

    // 1. Prioritize known lock files (TODO: Implement logic to find the best match)
    // For now, this is a placeholder.
    const knownLock = await this.storeClient.getKnownLockFile(
      `${Object.keys(packageJson.dependencies)[0]}.lock.json`
    );
    if (knownLock) {
      console.log('Found a pre-computed lock file. Using it.');
      return knownLock;
    }

    // 2. Resolve ranges using aliases
    const aliases = await this.storeClient.getAliases();
    const dependencies: Record<string, ResolvedDependency> = {};

    for (const [name, range] of Object.entries(packageJson.dependencies)) {
      const aliasKey = `${name}@${range}`;
      const pinnedVersion = aliases[aliasKey];

      if (pinnedVersion) {
        console.log(`Pinned ${name}@${range} to ${pinnedVersion} using alias.`);
        const pkgIndex = await this.storeClient.getPackageIndex(name);
        const match = pkgIndex.find(p => p.version === pinnedVersion);

        if (match) {
          dependencies[`${name}@${pinnedVersion}`] = {
            integrity: match.integrity,
            cas: match.cas,
            url: match.url,
          };
        } else {
          console.warn(`Could not find package data for aliased version ${name}@${pinnedVersion}`);
        }
      } else {
        console.warn(`No alias found for ${name}@${range}. Resolution will be incomplete.`);
        // TODO: Fallback to minimal SAT solver
      }
    }
    
    // 3. Construct the lock file
    const environment = this.getCurrentEnvironment();
    const lockFile: LockFile = {
      resolver: 'shigrami@0.1.0', // Placeholder version
      environment,
      dependencies,
    };

    // 4. Save the lock file
    const lockFilePath = path.join(projectRoot, 'depscompat-lock.json');
    await fs.writeFile(lockFilePath, JSON.stringify(lockFile, null, 2));
    console.log(`Lock file written to ${lockFilePath}`);

    return lockFile;
  }

  /**
   * Reads and parses the package.json file.
   * @param packageJsonPath - The full path to the package.json file.
   * @returns The parsed package.json content.
   */
  private async readPackageJson(packageJsonPath: string): Promise<{
    name: string;
    version: string;
    dependencies: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  }> {
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading package.json at ${packageJsonPath}`);
      throw error;
    }
  }

  /**
   * Gets the current environment information.
   * @returns The current resolution environment.
   */
  private getCurrentEnvironment(): ResolutionEnvironment {
    return {
      node: process.version,
      os: process.platform,
      cpu: process.arch,
      // abi detection is more complex and would be added here
    };
  }
}
