/**
 * MCP Server for Shigrami - Effect-TS Implementation
 * Model Context Protocol server for dependency compatibility
 *
 * Provides compatibility data to AI assistants via Model Context Protocol.
 * Similar to Context7 but for dependency compatibility instead of documentation.
 */
import { Effect, Context } from 'effect';
import type { CompatibilityDatabaseManager } from '../data/database.js';
declare const CompatibilityDatabase_base: Context.TagClass<CompatibilityDatabase, "CompatibilityDatabaseManager", CompatibilityDatabaseManager>;
export declare class CompatibilityDatabase extends CompatibilityDatabase_base {
}
export declare const startMCPServer: (db: CompatibilityDatabaseManager) => Effect.Effect<void, never, never>;
export declare class DepCompatMCPServer {
    private db;
    constructor(db: CompatibilityDatabaseManager);
    start(): Promise<void>;
}
export {};
