/**
 * Nix Store-like Derivation Hash Based Storage
 * Merkle DAG Node: derivation_store
 *
 * Content-addressable storage inspired by Nix store.
 * Each compatibility test result is stored based on its derivation hash.
 *
 * Features:
 * - Derivation-hash-based addressing (like Nix)
 * - Immutable storage (once written, never modified)
 * - Reproducible results (same input → same output)
 * - Concurrent-safe operations
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { PropertyGraph, PropertyValue } from '../types/compatibility-vie.js';

/**
 * Derivation - Build input specification
 * Like Nix derivation, defines all inputs needed to produce a result
 */
export interface CompatibilityDerivation {
  /** Framework and version */
  framework: {
    name: string;
    version: string;
  };

  /** React version (if applicable) */
  react?: string;

  /** Node.js version */
  node?: string;

  /** Package manager */
  packageManager?: 'npm' | 'yarn' | 'pnpm';

  /** Additional libraries */
  libraries?: Record<string, string>;

  /** Test environment constraints */
  environment?: {
    os?: string;
    arch?: string;
    timeout?: number;
  };

  /** Test script/command */
  testScript?: string;

  /** Metadata */
  metadata?: {
    requestedBy?: string;
    priority?: 'low' | 'normal' | 'high';
    tags?: string[];
  };
}

/**
 * Derivation Result - Test output
 */
export interface DerivationResult {
  /** Test status */
  status: 'pass' | 'fail' | 'warn' | 'error';

  /** Test duration in milliseconds */
  duration: number;

  /** Error message (if failed) */
  error?: string;

  /** Warning messages (if any) */
  warnings?: string[];

  /** Workaround suggestions */
  workarounds?: string[];

  /** Test output logs */
  logs?: string[];

  /** Test environment info */
  environment: {
    nodeVersion: string;
    npmVersion?: string;
    os: string;
    arch: string;
    timestamp: string;
  };

  /** Verification status */
  verified: boolean;

  /** Property graph representation */
  propertyGraph?: PropertyGraph;
}

/**
 * Store Entry - What gets stored in the store
 */
export interface StoreEntry {
  /** Derivation that produced this result */
  derivation: CompatibilityDerivation;

  /** Test result */
  result: DerivationResult;

  /** Store metadata */
  metadata: {
    derivationHash: string;
    created: string;
    size: number;
    compressed: boolean;
  };
}

/**
 * Nix Store-like Storage Manager
 */
export class NixStoreManager {
  private storePath: string;
  private cache: Map<string, StoreEntry> = new Map();

  constructor(storePath: string = '@store') {
    this.storePath = storePath;
  }

  /**
   * Initialize the store
   */
  async initialize(): Promise<void> {
    try {
      await fs.access(this.storePath);
    } catch {
      await fs.mkdir(this.storePath, { recursive: true });
    }

    // Load existing entries into cache
    await this.loadCache();
  }

  /**
   * Compute derivation hash (like Nix)
   * Hash is based on all inputs that affect the result
   */
  static computeDerivationHash(derivation: CompatibilityDerivation): string {
    // Sort keys for deterministic hashing
    const normalizedDerivation = {
      framework: derivation.framework,
      react: derivation.react,
      node: derivation.node,
      packageManager: derivation.packageManager,
      libraries: derivation.libraries ? this.sortObject(derivation.libraries) : undefined,
      environment: derivation.environment ? this.sortObject(derivation.environment) : undefined,
      testScript: derivation.testScript,
      // Exclude metadata from hash (doesn't affect result)
    };

    const derivationString = JSON.stringify(normalizedDerivation, null, 0);
    return crypto.createHash('sha256')
      .update(derivationString)
      .digest('hex');
  }

  /**
   * Store a test result
   * Like Nix, once stored, the result is immutable
   */
  async storeResult(derivation: CompatibilityDerivation, result: DerivationResult): Promise<string> {
    const derivationHash = NixStoreManager.computeDerivationHash(derivation);

    // Check if already exists (cache hit)
    const existingEntry = this.cache.get(derivationHash);
    if (existingEntry) {
      // Verify result matches (reproducibility check)
      if (!this.resultsEqual(existingEntry.result, result)) {
        throw new Error(`Reproducibility violation: different results for same derivation ${derivationHash}`);
      }
      return derivationHash;
    }

    // Create store entry
    const entry: StoreEntry = {
      derivation,
      result,
      metadata: {
        derivationHash,
        created: new Date().toISOString(),
        size: this.calculateEntrySize({ derivation, result }),
        compressed: false, // Could add compression later
      },
    };

    // Store in filesystem (immutable)
    const storePath = this.getStorePath(derivationHash);
    await fs.mkdir(path.dirname(storePath), { recursive: true });

    const entryData = JSON.stringify(entry, null, 2);
    await fs.writeFile(storePath, entryData, { flag: 'wx' }); // wx = write exclusive (fail if exists)

    // Update cache
    this.cache.set(derivationHash, entry);

    return derivationHash;
  }

  /**
   * Retrieve a test result by derivation hash
   */
  async getResult(derivationHash: string): Promise<StoreEntry | null> {
    // Check cache first
    const cachedEntry = this.cache.get(derivationHash);
    if (cachedEntry) {
      return cachedEntry;
    }

    // Load from filesystem
    const storePath = this.getStorePath(derivationHash);
    try {
      const data = await fs.readFile(storePath, 'utf-8');
      const entry: StoreEntry = JSON.parse(data);

      // Validate hash matches
      const computedHash = NixStoreManager.computeDerivationHash(entry.derivation);
      if (computedHash !== derivationHash) {
        throw new Error(`Hash mismatch for ${derivationHash}`);
      }

      // Cache it
      this.cache.set(derivationHash, entry);
      return entry;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // Not found
      }
      throw error;
    }
  }

  /**
   * Check if a derivation result exists
   */
  async hasResult(derivationHash: string): Promise<boolean> {
    return this.cache.has(derivationHash) || await this.fsExists(this.getStorePath(derivationHash));
  }

  /**
   * Get or compute result (lazy evaluation)
   * If result doesn't exist, compute it using the provided function
   */
  async getOrComputeResult(
    derivation: CompatibilityDerivation,
    computeFn: () => Promise<DerivationResult>
  ): Promise<{ hash: string; result: DerivationResult; cached: boolean }> {
    const derivationHash = NixStoreManager.computeDerivationHash(derivation);

    // Check cache/store
    const existingEntry = await this.getResult(derivationHash);
    if (existingEntry) {
      return {
        hash: derivationHash,
        result: existingEntry.result,
        cached: true,
      };
    }

    // Compute new result
    const result = await computeFn();

    // Store result
    await this.storeResult(derivation, result);

    return {
      hash: derivationHash,
      result,
      cached: false,
    };
  }

  /**
   * List all stored derivation hashes
   */
  async listDerivations(): Promise<string[]> {
    const entries = await fs.readdir(this.storePath, { withFileTypes: true });
    const hashes: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subEntries = await fs.readdir(path.join(this.storePath, entry.name));
        hashes.push(...subEntries.map(file => file.replace('.json', '')));
      }
    }

    return hashes;
  }

  /**
   * Get store statistics
   */
  async getStatistics(): Promise<{
    totalEntries: number;
    totalSize: number;
    cacheHits: number;
    averageEntrySize: number;
    oldestEntry: string;
    newestEntry: string;
  }> {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.metadata.size, 0);
    const timestamps = entries.map(e => new Date(e.metadata.created).getTime());

    return {
      totalEntries: entries.length,
      totalSize,
      cacheHits: this.cache.size, // Approximation
      averageEntrySize: entries.length > 0 ? totalSize / entries.length : 0,
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)).toISOString() : '',
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : '',
    };
  }

  /**
   * Garbage collection (remove unreferenced entries)
   * Like Nix GC, removes entries that are no longer referenced
   */
  async garbageCollect(referencedHashes: Set<string>): Promise<{
    removed: number;
    freedBytes: number;
  }> {
    let removed = 0;
    let freedBytes = 0;

    // Remove from cache
    for (const [hash, entry] of this.cache.entries()) {
      if (!referencedHashes.has(hash)) {
        this.cache.delete(hash);
        removed++;
        freedBytes += entry.metadata.size;
      }
    }

    // Remove from filesystem (would need to be careful in production)
    // For now, just return statistics
    // In a real implementation, this would traverse the store and remove unreferenced entries

    return { removed, freedBytes };
  }

  // Private helper methods

  private getStorePath(derivationHash: string): string {
    // Like Nix: /nix/store/{hash}-{name}
    // We use first 2 chars as directory, rest as filename
    const dir = derivationHash.substring(0, 2);
    const filename = derivationHash.substring(2) + '.json';
    return path.join(this.storePath, dir, filename);
  }

  private async loadCache(): Promise<void> {
    try {
      const hashes = await this.listDerivations();
      // Load a subset into cache for performance
      // In production, might want LRU cache or similar
      const toLoad = hashes.slice(0, 100); // Load first 100

      await Promise.all(toLoad.map(async (hash) => {
        try {
          await this.getResult(hash);
        } catch (error) {
          console.warn(`Failed to load ${hash}:`, error instanceof Error ? error.message : String(error));
        }
      }));
    } catch (error) {
      console.warn('Failed to load store cache:', error);
    }
  }

  private async fsExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private calculateEntrySize(entry: { derivation: CompatibilityDerivation; result: DerivationResult }): number {
    return Buffer.byteLength(JSON.stringify(entry), 'utf8');
  }

  private resultsEqual(a: DerivationResult, b: DerivationResult): boolean {
    // Compare essential fields (simplified)
    return a.status === b.status &&
           a.error === b.error &&
           a.verified === b.verified;
  }

  private static sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = obj[key];
    });
    return sorted;
  }
}

/**
 * Derivation Builder - Helper for creating derivations
 */
export class DerivationBuilder {
  private derivation: Partial<CompatibilityDerivation> = {};

  framework(name: string, version: string): DerivationBuilder {
    this.derivation.framework = { name, version };
    return this;
  }

  react(version: string): DerivationBuilder {
    this.derivation.react = version;
    return this;
  }

  node(version: string): DerivationBuilder {
    this.derivation.node = version;
    return this;
  }

  packageManager(manager: 'npm' | 'yarn' | 'pnpm'): DerivationBuilder {
    this.derivation.packageManager = manager;
    return this;
  }

  library(name: string, version: string): DerivationBuilder {
    if (!this.derivation.libraries) {
      this.derivation.libraries = {};
    }
    this.derivation.libraries[name] = version;
    return this;
  }

  libraries(libs: Record<string, string>): DerivationBuilder {
    this.derivation.libraries = { ...libs };
    return this;
  }

  environment(env: CompatibilityDerivation['environment']): DerivationBuilder {
    this.derivation.environment = env;
    return this;
  }

  testScript(script: string): DerivationBuilder {
    this.derivation.testScript = script;
    return this;
  }

  metadata(meta: CompatibilityDerivation['metadata']): DerivationBuilder {
    this.derivation.metadata = meta;
    return this;
  }

  build(): CompatibilityDerivation {
    if (!this.derivation.framework) {
      throw new Error('Framework is required');
    }
    return this.derivation as CompatibilityDerivation;
  }

  getHash(): string {
    return NixStoreManager.computeDerivationHash(this.build());
  }
}
