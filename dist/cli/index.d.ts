/**
 * CLI Interface for DepCompat
 * Merkle DAG Node: cli_tools
 *
 * Command-line interface for interacting with the compatibility database.
 * Provides commands for checking compatibility, reporting issues, and managing data.
 */
import type { CompatibilityDatabaseManager } from '../data/database.js';
export interface CLIOptions {
    node?: string;
    packageManager?: 'npm' | 'yarn' | 'pnpm';
    framework?: string;
    status?: 'pass' | 'fail' | 'warn';
    limit?: string;
    verified?: boolean;
    react?: string;
    libs?: string;
    error?: string;
    workaround?: string;
    output?: string;
    projectRoot?: string;
    rulesFile?: string;
}
export declare class CLI {
    private db;
    constructor(db: CompatibilityDatabaseManager);
    /**
     * Check project compatibility using an incidence graph.
     * Merkle DAG Edge: cli_tools -> incidence_graph_checker_service
     */
    checkIncidenceGraph(options: CLIOptions): Promise<void>;
    /**
     * Resolve project dependencies using the new resolver service.
     */
    resolveDependencies(options: CLIOptions): Promise<void>;
    /**
     * Check compatibility for a framework and packages
     */
    checkCompatibility(framework: string, packages: string[], options: CLIOptions): Promise<void>;
    /**
     * Search compatibility database
     */
    searchCompatibility(_query: string | undefined, options: CLIOptions): Promise<void>;
    /**
     * Report a new compatibility issue
     */
    reportIssue(options: CLIOptions): Promise<void>;
    /**
     * Show database statistics
     */
    showStats(): Promise<void>;
    /**
     * Export compatibility database
     */
    exportDatabase(outputFile: string): Promise<void>;
    /**
     * Simple version matching utility
     */
    private matchesVersion;
}
