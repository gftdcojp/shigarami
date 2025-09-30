/**
 * MCP Server for Shigrami - Effect-TS Implementation
 * Model Context Protocol server for dependency compatibility
 *
 * Provides compatibility data to AI assistants via Model Context Protocol.
 * Similar to Context7 but for dependency compatibility instead of documentation.
 */

import { Effect, Layer, Console, Context } from 'effect';
import { NodeRuntime } from '@effect/platform-node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { CompatibilityDatabaseManager } from '../data/database.js';

// MCP Tool Definitions
export class CompatibilityDatabase extends Context.Tag("CompatibilityDatabaseManager")<
  CompatibilityDatabase,
  CompatibilityDatabaseManager
>() {}

const CompatibilityDatabaseLive = Layer.succeed(
  CompatibilityDatabase,
  null as any // Will be provided when starting
);

// MCP Tools
const listTools = () => [
  {
    name: 'search_compatibility',
    description: 'Search for dependency compatibility issues',
    inputSchema: {
      type: 'object',
      properties: {
        framework: { type: 'string', description: 'Framework name (optional)' },
        status: { type: 'string', enum: ['pass', 'fail', 'warn'], description: 'Status filter (optional)' },
        limit: { type: 'number', description: 'Maximum results (optional)', default: 10 },
      },
      required: [],
    },
  },
  {
    name: 'get_compatibility_stats',
    description: 'Get overall compatibility statistics',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'report_compatibility_issue',
    description: 'Report a new compatibility issue',
    inputSchema: {
      type: 'object',
      properties: {
        framework: { type: 'string', description: 'Framework name' },
        version: { type: 'string', description: 'Framework version' },
        status: { type: 'string', enum: ['pass', 'fail', 'warn'], description: 'Compatibility status' },
        react: { type: 'string', description: 'React version (optional)' },
        error: { type: 'string', description: 'Error description (optional)' },
        workaround: { type: 'string', description: 'Workaround suggestion (optional)' },
      },
      required: ['framework', 'version', 'status'],
    },
  },
];

const handleToolCall = (db: CompatibilityDatabaseManager, name: string, args: any) =>
  Effect.gen(function* (_) {
    switch (name) {
      case 'search_compatibility': {
        const query = {
          framework: args.framework || undefined,
          status: args.status || undefined,
          limit: args.limit || 10,
        };

        const issues = yield* _(Effect.tryPromise({
          try: () => db.queryIssues(query),
          catch: (e) => new Error(`Database query failed: ${e}`),
        }));

        return {
          content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
        };
      }

      case 'get_compatibility_stats': {
        const stats = db.getStats();
        return {
          content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
        };
      }

      case 'report_compatibility_issue': {
        // Generate ID
        const components = [
          args.framework,
          args.version,
          args.react,
          args.node,
          args.packageManager,
        ].filter(Boolean);

        const crypto = yield* _(Effect.promise(() => import('crypto')));
        const id = crypto.default.createHash('sha256').update(components.join('|')).digest('hex').substring(0, 16);

        const issue = {
          id,
          framework: args.framework,
          version: args.version,
          react: args.react,
          status: args.status,
          error: args.error,
          workaround: args.workaround,
          source: 'manual' as const, // MCP reports are treated as manual for now
          reportedAt: new Date().toISOString(),
          verified: false,
        };

        yield* _(Effect.tryPromise({
          try: () => db.saveIssue(issue),
          catch: (e) => new Error(`Failed to save issue: ${e}`),
        }));

        return {
          content: [{ type: 'text', text: `Issue reported successfully with ID: ${id}` }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  });

// MCP Server Implementation
const createMCPServer = (db: CompatibilityDatabaseManager) => {
  const server = new Server({
    name: 'shigrami-mcp',
    version: '0.1.0',
  });

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listTools(),
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await Effect.runPromise(handleToolCall(db, name, args || {}));
      return result;
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  return server;
};

export const startMCPServer = (db: CompatibilityDatabaseManager) =>
  Effect.gen(function* (_) {
    yield* _(Console.log('🚀 Starting Shigrami MCP Server'));

    const server = createMCPServer(db);
    const transport = new StdioServerTransport();

    // MCP server setup (simplified for now)
    yield* _(Console.log('✅ MCP Server initialized'));
    yield* _(Console.log('   Available tools: search_compatibility, get_compatibility_stats, report_compatibility_issue'));
    yield* _(Console.log('   Note: MCP server requires proper client connection setup'));

    // Keep the server running (simplified)
    yield* _(Effect.never);
  });

// Legacy class for backwards compatibility
export class DepCompatMCPServer {
  private db: CompatibilityDatabaseManager;

  constructor(db: CompatibilityDatabaseManager) {
    this.db = db;
  }

  async start(): Promise<void> {
    const effect = startMCPServer(this.db);
    await Effect.runPromise(effect);
  }
}