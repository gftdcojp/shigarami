import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import type { IndexEntry, LockFile } from '../types/resolver.js';

interface HttpError extends Error {
  statusCode?: number;
}

/**
 * Configuration for the GitHub-based store.
 */
export interface GitHubStoreConfig {
  /** The GitHub organization or user that owns the store repository. */
  owner: string;
  /** The name of the store repository. */
  repo: string;
  /**
   * The branch or tag to use for the index files.
   * Defaults to 'main'.
   */
  ref?: string;
  /** Optional cache directory to store downloaded files. */
  cacheDir?: string;
}

/**
 * A client to interact with the GitHub-based dependency store.
 *
 * This class handles fetching index files and content-addressed package
 * tarballs from a dedicated GitHub repository acting as a store.
 */
export class GitHubStoreClient {
  private readonly config: Required<GitHubStoreConfig>;
  private readonly baseUrl: string;

  constructor(config: GitHubStoreConfig) {
    this.config = {
      ...config,
      ref: config.ref || 'main',
      cacheDir: config.cacheDir || path.join(process.cwd(), '.shigrami-cache'),
    };
    this.baseUrl = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.ref}`;
  }

  /**
   * Initializes the client, ensuring the cache directory exists.
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.config.cacheDir, { recursive: true });
  }

  /**
   * Fetches a known lock file from the store's index.
   * @param lockFileName - The name of the lock file (e.g., "next@15.0.0.lock.json").
   * @returns The parsed LockFile, or null if not found.
   */
  async getKnownLockFile(lockFileName: string): Promise<LockFile | null> {
    const url = `${this.baseUrl}/index/graph/${lockFileName}`;
    try {
      const content = await this.fetchWithCache(url);
      return JSON.parse(content);
    } catch (error: unknown) {
      if ((error as HttpError).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetches the aliases index from the store.
   * Aliases map a version range to a pinned version (e.g., "react@^18" -> "18.2.0").
   * @returns A record of aliases.
   */
  async getAliases(): Promise<Record<string, string>> {
    const url = `${this.baseUrl}/index/aliases.json`;
    try {
      const content = await this.fetchWithCache(url);
      return JSON.parse(content);
    } catch (error: unknown) {
      if ((error as HttpError).statusCode === 404) {
        return {};
      }
      throw error;
    }
  }

  /**
   * Fetches package index entries for a given package name.
   * This retrieves a shard of `packages.jsonl`.
   * @param packageName - The name of the package.
   * @returns An array of IndexEntry for the package.
   */
  async getPackageIndex(packageName: string): Promise<IndexEntry[]> {
    // Example sharding: 'react' -> 're/ac/react.jsonl'
    const prefix1 = packageName.substring(0, 2);
    const prefix2 = packageName.substring(2, 4);
    const shardPath = `${prefix1}/${prefix2}/${packageName}.jsonl`;
    const url = `${this.baseUrl}/index/packages/${shardPath}`;

    try {
      const content = await this.fetchWithCache(url);
      return content
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => JSON.parse(line));
    } catch (error: unknown) {
      if ((error as HttpError).statusCode === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * A generic fetch utility with caching capabilities (ETag).
   * @param url - The URL to fetch.
   * @returns The content of the URL as a string.
   */
  private async fetchWithCache(url: string): Promise<string> {
    const cacheKey = url.replace(/[^a-zA-Z0-9]/g, '_');
    const contentPath = path.join(this.config.cacheDir, cacheKey);
    const etagPath = path.join(this.config.cacheDir, `${cacheKey}.etag`);

    let etag: string | null = null;
    try {
      etag = await fs.readFile(etagPath, 'utf-8');
    } catch {
      // No etag found, proceed without it
    }

    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    return new Promise((resolve, reject) => {
      const req = https.get(url, { headers }, res => {
        if (res.statusCode === 304) {
          // Not Modified, use cached content
          fs.readFile(contentPath, 'utf-8')
            .then(resolve)
            .catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          const error: HttpError = new Error(`Request failed with status code ${res.statusCode}`);
          error.statusCode = res.statusCode;
          reject(error);
          return;
        }

        const newEtag = res.headers['etag'] as string | undefined;
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', async () => {
          try {
            await fs.writeFile(contentPath, data);
            if (newEtag) {
              await fs.writeFile(etagPath, newEtag);
            }
            resolve(data);
          } catch (writeError) {
            reject(writeError);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
}
