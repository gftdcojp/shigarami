/**
 * MCP Server for Shigrami
 * Model Context Protocol server (mock implementation)
 *
 * Provides compatibility data to AI assistants via Model Context Protocol.
 * Similar to Context7 but for dependency compatibility instead of documentation.
 */
import { CompatibilityDatabaseManager } from '../data/database.js';
export declare class DepCompatMCPServer {
    private db;
    constructor(db: CompatibilityDatabaseManager);
    /**
     * Start the MCP server (mock)
     */
    start(): Promise<void>;
}
