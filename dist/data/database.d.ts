/**
 * Compatibility Database Manager
 * Merkle DAG Node: data_processor
 *
 * Manages the storage, retrieval, and validation of compatibility data.
 * Ensures data integrity through merkle hashing and schema validation.
 */
import { CompatibilityIssue, CompatibilityQuery, CompatibilityDatabase } from '../types/compatibility.js';
export declare class CompatibilityDatabaseManager {
    private dataDir;
    private cache;
    private merkleTree;
    constructor(dataDir?: string);
    /**
     * Initialize the database by loading all compatibility issues
     */
    initialize(): Promise<void>;
    /**
     * Load all compatibility issues from disk
     */
    private loadAllIssues;
    /**
     * Build merkle tree for data integrity verification
     */
    private buildMerkleTree;
    /**
     * Calculate merkle root of all issues
     */
    private calculateMerkleRoot;
    /**
     * Query compatibility issues with filtering
     */
    queryIssues(query: CompatibilityQuery): Promise<CompatibilityIssue[]>;
    /**
     * Get a specific compatibility issue by ID
     */
    getIssue(id: string): Promise<CompatibilityIssue | null>;
    /**
     * Add or update a compatibility issue
     */
    saveIssue(issue: CompatibilityIssue): Promise<void>;
    /**
     * Delete a compatibility issue
     */
    deleteIssue(id: string): Promise<boolean>;
    /**
     * Export the entire database
     */
    exportDatabase(): Promise<CompatibilityDatabase>;
    /**
     * Get database statistics
     */
    getStats(): {
        total: number;
        verified: number;
        failed: number;
        warned: number;
        passed: number;
        frameworks: string[];
        lastUpdated: number;
        merkleRoot: string;
    };
    /**
     * Ensure data directory exists
     */
    private ensureDataDirectory;
    /**
     * Save database metadata
     */
    private saveDatabaseMetadata;
    /**
     * Generate a unique ID for a compatibility issue
     */
    private generateIssueId;
    /**
     * Check if a version matches a constraint (simple semver matching)
     */
    private matchesVersion;
}
