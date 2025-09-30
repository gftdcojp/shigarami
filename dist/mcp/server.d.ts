/**
 * MCP Server for DepCompat
 * Merkle DAG Node: mcp_server
 *
 * Provides compatibility data to AI assistants via Model Context Protocol.
 * Similar to Context7 but for dependency compatibility instead of documentation.
 */
import { CompatibilityDatabaseManager } from '../data/database.js';
export declare class DepCompatMCPServer {
    private server;
    private db;
    constructor(db: CompatibilityDatabaseManager);
    /**
     * Start the MCP server
     */
    start(): Promise<void>;
    /**
     * Set up tool handlers for MCP
     */
    private setupToolHandlers;
    /**
     * Handle search compatibility tool
     */
    private handleSearchCompatibility;
    /**
     * Handle resolve compatibility tool
     */
    private handleResolveCompatibility;
    /**
     * Handle get compatibility issues tool
     */
    private handleGetCompatibilityIssues;
    /**
     * Handle get compatibility stats tool
     */
    private handleGetCompatibilityStats;
    /**
     * Simple version matching utility
     */
    private matchesVersion;
}
