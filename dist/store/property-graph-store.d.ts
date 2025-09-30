/**
 * Property Graph Store Integration
 * Merkle DAG Node: property_graph_store_integration
 *
 * Integrates Property Graph with Nix Store-like derivation system.
 * Each graph element is stored based on its derivation hash.
 */
import { PropertyGraph, PropertyVertex, PropertyIncident, PropertyEvent } from '../types/compatibility-vie.js';
import { NixStoreManager, CompatibilityDerivation, DerivationBuilder } from './derivation.js';
/**
 * Property Graph Store Entry
 * Links derivation hash to property graph elements
 */
export interface PropertyGraphStoreEntry {
    /** Derivation hash */
    derivationHash: string;
    /** Graph elements produced by this derivation */
    elements: {
        vertices: PropertyVertex[];
        incidents: PropertyIncident[];
        events: PropertyEvent[];
    };
    /** Metadata */
    metadata: {
        created: string;
        elementCount: number;
        derivation: CompatibilityDerivation;
    };
}
/**
 * Property Graph Store Manager
 * Manages property graphs in Nix Store-like fashion
 */
export declare class PropertyGraphStoreManager {
    private storeManager;
    constructor(storeManager: NixStoreManager);
    /**
     * Store a property graph based on derivation
     */
    storePropertyGraph(derivation: CompatibilityDerivation, propertyGraph: PropertyGraph): Promise<string>;
    /**
     * Retrieve property graph by derivation hash
     */
    getPropertyGraph(derivationHash: string): Promise<PropertyGraph | null>;
    /**
     * Get or compute property graph (lazy evaluation)
     */
    getOrComputePropertyGraph(derivation: CompatibilityDerivation, computeFn: () => Promise<PropertyGraph>): Promise<{
        hash: string;
        graph: PropertyGraph;
        cached: boolean;
    }>;
    /**
     * Store compatibility issues as property graph
     */
    storeCompatibilityIssues(issues: any[]): Promise<string>;
    /**
     * Retrieve compatibility issues from property graph
     */
    getCompatibilityIssues(derivationHash: string): Promise<any[] | null>;
    /**
     * Query property graphs by derivation patterns
     */
    queryByDerivationPattern(pattern: Partial<CompatibilityDerivation>): Promise<PropertyGraphStoreEntry[]>;
    /**
     * Merge multiple property graphs
     */
    mergePropertyGraphs(derivationHashes: string[], mergeDerivation: CompatibilityDerivation): Promise<string>;
    /**
     * Export property graph to various formats
     */
    exportPropertyGraph(derivationHash: string, format?: 'json' | 'jsonl' | 'csv'): Promise<string>;
    /**
     * Get property graph diff between two versions
     */
    diffPropertyGraphs(hash1: string, hash2: string): Promise<{
        added: {
            vertices: PropertyVertex[];
            incidents: PropertyIncident[];
            events: PropertyEvent[];
        };
        removed: {
            vertices: PropertyVertex[];
            incidents: PropertyIncident[];
            events: PropertyEvent[];
        };
        modified: {
            vertices: PropertyVertex[];
            incidents: PropertyIncident[];
            events: PropertyEvent[];
        };
    }>;
    private derivationMatchesPattern;
}
/**
 * High-level Property Graph Store API
 * Provides convenient methods for common operations
 */
export declare class PropertyGraphStore {
    private manager;
    constructor(storePath?: string);
    initialize(): Promise<void>;
    /**
     * Store compatibility issues
     */
    storeCompatibilityData(issues: any[]): Promise<string>;
    /**
     * Retrieve compatibility issues
     */
    getCompatibilityData(hash: string): Promise<any[] | null>;
    /**
     * Query stored graphs
     */
    queryStoredGraphs(pattern: Partial<CompatibilityDerivation>): Promise<PropertyGraphStoreEntry[]>;
    /**
     * Get store statistics
     */
    getStoreStats(): Promise<{
        totalEntries: number;
        totalSize: number;
        cacheHits: number;
        averageEntrySize: number;
        oldestEntry: string;
        newestEntry: string;
    }>;
    /**
     * Export graph in different formats
     */
    exportGraph(hash: string, format?: 'json' | 'jsonl' | 'csv'): Promise<string>;
    /**
     * Get derivation hash for a derivation
     */
    getDerivationHash(derivation: CompatibilityDerivation): string;
    /**
     * Create derivation builder
     */
    createDerivation(): DerivationBuilder;
}
