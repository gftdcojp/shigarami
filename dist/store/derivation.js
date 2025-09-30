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
/**
 * Nix Store-like Storage Manager
 */
export class NixStoreManager {
    storePath;
    cache = new Map();
    constructor(storePath = '@store') {
        this.storePath = storePath;
    }
    /**
     * Initialize the store
     */
    async initialize() {
        try {
            await fs.access(this.storePath);
        }
        catch {
            await fs.mkdir(this.storePath, { recursive: true });
        }
        // Load existing entries into cache
        await this.loadCache();
    }
    /**
     * Compute derivation hash (like Nix)
     * Hash is based on all inputs that affect the result
     */
    static computeDerivationHash(derivation) {
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
    async storeResult(derivation, result) {
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
        const entry = {
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
    async getResult(derivationHash) {
        // Check cache first
        const cachedEntry = this.cache.get(derivationHash);
        if (cachedEntry) {
            return cachedEntry;
        }
        // Load from filesystem
        const storePath = this.getStorePath(derivationHash);
        try {
            const data = await fs.readFile(storePath, 'utf-8');
            const entry = JSON.parse(data);
            // Validate hash matches
            const computedHash = NixStoreManager.computeDerivationHash(entry.derivation);
            if (computedHash !== derivationHash) {
                throw new Error(`Hash mismatch for ${derivationHash}`);
            }
            // Cache it
            this.cache.set(derivationHash, entry);
            return entry;
        }
        catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
                return null; // Not found
            }
            throw error;
        }
    }
    /**
     * Check if a derivation result exists
     */
    async hasResult(derivationHash) {
        return this.cache.has(derivationHash) || await this.fsExists(this.getStorePath(derivationHash));
    }
    /**
     * Get or compute result (lazy evaluation)
     * If result doesn't exist, compute it using the provided function
     */
    async getOrComputeResult(derivation, computeFn) {
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
    async listDerivations() {
        const entries = await fs.readdir(this.storePath, { withFileTypes: true });
        const hashes = [];
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
    async getStatistics() {
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
    async garbageCollect(referencedHashes) {
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
    getStorePath(derivationHash) {
        // Like Nix: /nix/store/{hash}-{name}
        // We use first 2 chars as directory, rest as filename
        const dir = derivationHash.substring(0, 2);
        const filename = derivationHash.substring(2) + '.json';
        return path.join(this.storePath, dir, filename);
    }
    async loadCache() {
        try {
            const hashes = await this.listDerivations();
            // Load a subset into cache for performance
            // In production, might want LRU cache or similar
            const toLoad = hashes.slice(0, 100); // Load first 100
            await Promise.all(toLoad.map(async (hash) => {
                try {
                    await this.getResult(hash);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.warn(`Failed to load ${hash}:`, errorMessage);
                }
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Failed to load store cache:', errorMessage);
        }
    }
    async fsExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    calculateEntrySize(entry) {
        return Buffer.byteLength(JSON.stringify(entry), 'utf8');
    }
    resultsEqual(a, b) {
        // Compare essential fields (simplified)
        return a.status === b.status &&
            a.error === b.error &&
            a.verified === b.verified;
    }
    static sortObject(obj) {
        const sorted = {};
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
    derivation = {};
    framework(name, version) {
        this.derivation.framework = { name, version };
        return this;
    }
    react(version) {
        this.derivation.react = version;
        return this;
    }
    node(version) {
        this.derivation.node = version;
        return this;
    }
    packageManager(manager) {
        this.derivation.packageManager = manager;
        return this;
    }
    library(name, version) {
        if (!this.derivation.libraries) {
            this.derivation.libraries = {};
        }
        this.derivation.libraries[name] = version;
        return this;
    }
    libraries(libs) {
        this.derivation.libraries = { ...libs };
        return this;
    }
    environment(env) {
        this.derivation.environment = env;
        return this;
    }
    testScript(script) {
        this.derivation.testScript = script;
        return this;
    }
    metadata(meta) {
        this.derivation.metadata = meta;
        return this;
    }
    build() {
        if (!this.derivation.framework) {
            throw new Error('Framework is required');
        }
        return this.derivation;
    }
    getHash() {
        // Create a partial derivation for hashing (without validation)
        const partialDerivation = {
            framework: this.derivation.framework,
            react: this.derivation.react,
            node: this.derivation.node,
            packageManager: this.derivation.packageManager,
            libraries: this.derivation.libraries,
            environment: this.derivation.environment,
            testScript: this.derivation.testScript,
            // Exclude metadata from hash
        };
        if (!partialDerivation.framework) {
            throw new Error('Framework is required for hash computation');
        }
        return NixStoreManager.computeDerivationHash(partialDerivation);
    }
}
