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
import { PropertyGraph } from '../types/compatibility-vie.js';
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
export declare class NixStoreManager {
    private storePath;
    private cache;
    constructor(storePath?: string);
    /**
     * Initialize the store
     */
    initialize(): Promise<void>;
    /**
     * Compute derivation hash (like Nix)
     * Hash is based on all inputs that affect the result
     */
    static computeDerivationHash(derivation: CompatibilityDerivation): string;
    /**
     * Store a test result
     * Like Nix, once stored, the result is immutable
     */
    storeResult(derivation: CompatibilityDerivation, result: DerivationResult): Promise<string>;
    /**
     * Retrieve a test result by derivation hash
     */
    getResult(derivationHash: string): Promise<StoreEntry | null>;
    /**
     * Check if a derivation result exists
     */
    hasResult(derivationHash: string): Promise<boolean>;
    /**
     * Get or compute result (lazy evaluation)
     * If result doesn't exist, compute it using the provided function
     */
    getOrComputeResult(derivation: CompatibilityDerivation, computeFn: () => Promise<DerivationResult>): Promise<{
        hash: string;
        result: DerivationResult;
        cached: boolean;
    }>;
    /**
     * List all stored derivation hashes
     */
    listDerivations(): Promise<string[]>;
    /**
     * Get store statistics
     */
    getStatistics(): Promise<{
        totalEntries: number;
        totalSize: number;
        cacheHits: number;
        averageEntrySize: number;
        oldestEntry: string;
        newestEntry: string;
    }>;
    /**
     * Garbage collection (remove unreferenced entries)
     * Like Nix GC, removes entries that are no longer referenced
     */
    garbageCollect(referencedHashes: Set<string>): Promise<{
        removed: number;
        freedBytes: number;
    }>;
    private getStorePath;
    private loadCache;
    private fsExists;
    private calculateEntrySize;
    private resultsEqual;
    private static sortObject;
}
/**
 * Derivation Builder - Helper for creating derivations
 */
export declare class DerivationBuilder {
    private derivation;
    framework(name: string, version: string): DerivationBuilder;
    react(version: string): DerivationBuilder;
    node(version: string): DerivationBuilder;
    packageManager(manager: 'npm' | 'yarn' | 'pnpm'): DerivationBuilder;
    library(name: string, version: string): DerivationBuilder;
    libraries(libs: Record<string, string>): DerivationBuilder;
    environment(env: CompatibilityDerivation['environment']): DerivationBuilder;
    testScript(script: string): DerivationBuilder;
    metadata(meta: CompatibilityDerivation['metadata']): DerivationBuilder;
    build(): CompatibilityDerivation;
    getHash(): string;
}
