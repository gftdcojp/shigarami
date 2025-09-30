/**
 * MCP Server for Shigrami
 * Model Context Protocol server (mock implementation)
 *
 * Provides compatibility data to AI assistants via Model Context Protocol.
 * Similar to Context7 but for dependency compatibility instead of documentation.
 */
export class DepCompatMCPServer {
    db;
    constructor(db) {
        this.db = db;
        console.log('MCP server initialized (mock implementation)');
    }
    /**
     * Start the MCP server (mock)
     */
    async start() {
        console.log('🚀 Shigrami MCP server started (mock implementation)');
        console.log('   MCP functionality temporarily disabled due to SDK compatibility issues');
        console.log('   Use CLI commands or GitHub Pages for now');
    }
}
