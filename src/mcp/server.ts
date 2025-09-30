/**
 * MCP Server for DepCompat
 * Merkle DAG Node: mcp_server
 *
 * Provides compatibility data to AI assistants via Model Context Protocol.
 * Similar to Context7 but for dependency compatibility instead of documentation.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CompatibilityDatabaseManager } from '../data/database.js';
import {
  MCPSearchCompatibilityArgs,
  MCPResolveCompatibilityArgs,
  MCPGetCompatibilityIssuesArgs,
  CompatibilityQuery,
  CompatibilityCheck,
} from '../types/compatibility.js';

export class DepCompatMCPServer {
  private server: Server;
  private db: CompatibilityDatabaseManager;

  constructor(db: CompatibilityDatabaseManager) {
    this.db = db;
    this.server = new Server(
      {
        name: 'shigrami',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DepCompat MCP server started');
  }

  /**
   * Set up tool handlers for MCP
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_compatibility',
            description: 'Search for dependency compatibility issues',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (framework, library, or issue description)',
                },
                framework: {
                  type: 'string',
                  description: 'Filter by framework (next, react, vue, etc.)',
                },
                status: {
                  type: 'string',
                  enum: ['pass', 'fail', 'warn'],
                  description: 'Filter by compatibility status',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10,
                },
              },
            },
          },
          {
            name: 'resolve_compatibility',
            description: 'Check compatibility for specific package combinations',
            inputSchema: {
              type: 'object',
              required: ['framework', 'packages'],
              properties: {
                framework: {
                  type: 'string',
                  description: 'Primary framework (e.g., "next@15.0.0")',
                },
                packages: {
                  type: 'object',
                  description: 'Additional packages to check (e.g., {"react": "19.0.0", "next-auth": "5.0.0"})',
                },
                environment: {
                  type: 'object',
                  properties: {
                    node: {
                      type: 'string',
                      description: 'Node.js version',
                    },
                    packageManager: {
                      type: 'string',
                      enum: ['npm', 'yarn', 'pnpm'],
                      description: 'Package manager',
                    },
                  },
                },
              },
            },
          },
          {
            name: 'get_compatibility_issues',
            description: 'Get detailed information about specific compatibility issues',
            inputSchema: {
              type: 'object',
              required: ['ids'],
              properties: {
                ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of compatibility issue IDs',
                },
              },
            },
          },
          {
            name: 'get_compatibility_stats',
            description: 'Get statistics about the compatibility database',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_compatibility':
            return await this.handleSearchCompatibility(args as unknown as MCPSearchCompatibilityArgs);

          case 'resolve_compatibility':
            return await this.handleResolveCompatibility(args as unknown as MCPResolveCompatibilityArgs);

          case 'get_compatibility_issues':
            return await this.handleGetCompatibilityIssues(args as unknown as MCPGetCompatibilityIssuesArgs);

          case 'get_compatibility_stats':
            return await this.handleGetCompatibilityStats();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle search compatibility tool
   */
  private async handleSearchCompatibility(args: MCPSearchCompatibilityArgs) {
    const query: CompatibilityQuery = {
      framework: args.framework,
      status: args.status as 'pass' | 'fail' | 'warn' | undefined,
      limit: args.limit || 10,
    };

    const issues = await this.db.queryIssues(query);

    const formattedResults = issues.map(issue => ({
      id: issue.id,
      framework: `${issue.framework}@${issue.version}`,
      status: issue.status,
      description: issue.error || 'No description available',
      workaround: issue.workaround || 'No workaround available',
      verified: issue.verified,
      reportedAt: issue.reportedAt,
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${issues.length} compatibility issues:\n\n` +
                formattedResults.map(issue =>
                  `**${issue.framework}** - ${issue.status.toUpperCase()}\n` +
                  `Description: ${issue.description}\n` +
                  `Workaround: ${issue.workaround}\n` +
                  `Verified: ${issue.verified ? 'Yes' : 'No'}\n` +
                  `Reported: ${new Date(issue.reportedAt).toLocaleDateString()}\n`
                ).join('\n---\n\n'),
        },
      ],
    };
  }

  /**
   * Handle resolve compatibility tool
   */
  private async handleResolveCompatibility(args: MCPResolveCompatibilityArgs) {
    // Parse framework string (e.g., "next@15.0.0")
    const [framework, version] = args.framework.includes('@')
      ? args.framework.split('@')
      : [args.framework, undefined];

    if (!version) {
      throw new Error('Framework version must be specified (e.g., "next@15.0.0")');
    }

    const query: CompatibilityQuery = {
      framework,
      version,
      limit: 50, // Get more results for analysis
    };

    const issues = await this.db.queryIssues(query);

    // Filter issues that match the provided packages
    const relevantIssues = issues.filter(issue => {
      if (!issue.libs) return false;

      return Object.entries(args.packages).every(([pkg, ver]) => {
        const issuePkg = issue.libs![pkg];
        return issuePkg && this.matchesVersion(issuePkg, ver);
      });
    });

    if (relevantIssues.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No known compatibility issues found for ${args.framework} with the specified packages. This combination may work, but hasn't been tested yet.`,
          },
        ],
      };
    }

    // Analyze the most relevant issues
    const failedIssues = relevantIssues.filter(i => i.status === 'fail');
    const warnedIssues = relevantIssues.filter(i => i.status === 'warn');

    let result = `Compatibility analysis for ${args.framework}:\n\n`;

    if (failedIssues.length > 0) {
      result += `❌ **Known Failures:**\n`;
      failedIssues.slice(0, 3).forEach(issue => {
        result += `- ${issue.error}\n`;
        if (issue.workaround) {
          result += `  Workaround: ${issue.workaround}\n`;
        }
      });
      result += '\n';
    }

    if (warnedIssues.length > 0) {
      result += `⚠️ **Known Warnings:**\n`;
      warnedIssues.slice(0, 3).forEach(issue => {
        result += `- ${issue.error}\n`;
        if (issue.workaround) {
          result += `  Workaround: ${issue.workaround}\n`;
        }
      });
      result += '\n';
    }

    const successRate = (relevantIssues.filter(i => i.status === 'pass').length / relevantIssues.length) * 100;
    result += `📊 **Success Rate:** ${successRate.toFixed(1)}% (${relevantIssues.filter(i => i.status === 'pass').length}/${relevantIssues.length} combinations)`;

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }

  /**
   * Handle get compatibility issues tool
   */
  private async handleGetCompatibilityIssues(args: MCPGetCompatibilityIssuesArgs) {
    const issues = await Promise.all(
      args.ids.map(id => this.db.getIssue(id))
    );

    const validIssues = issues.filter((issue): issue is NonNullable<typeof issue> => issue !== null);

    if (validIssues.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No compatibility issues found with the provided IDs.',
          },
        ],
      };
    }

    const detailedInfo = validIssues.map(issue => {
      let info = `## Issue ${issue.id}\n\n`;
      info += `**Framework:** ${issue.framework}@${issue.version}\n`;
      if (issue.react) info += `**React:** ${issue.react}\n`;
      if (issue.node) info += `**Node.js:** ${issue.node}\n`;
      if (issue.packageManager) info += `**Package Manager:** ${issue.packageManager}\n`;

      if (issue.libs && Object.keys(issue.libs).length > 0) {
        info += `**Additional Libraries:**\n`;
        Object.entries(issue.libs).forEach(([lib, ver]) => {
          info += `  - ${lib}@${ver}\n`;
        });
      }

      info += `**Status:** ${issue.status.toUpperCase()}\n`;
      info += `**Verified:** ${issue.verified ? 'Yes' : 'No'}\n`;
      info += `**Source:** ${issue.source}\n`;
      info += `**Reported:** ${new Date(issue.reportedAt).toLocaleDateString()}\n\n`;

      if (issue.error) {
        info += `**Error:** ${issue.error}\n\n`;
      }

      if (issue.workaround) {
        info += `**Workaround:** ${issue.workaround}\n\n`;
      }

      if (issue.issueUrl) {
        info += `**Reference:** ${issue.issueUrl}\n\n`;
      }

      return info;
    }).join('---\n\n');

    return {
      content: [
        {
          type: 'text',
          text: detailedInfo,
        },
      ],
    };
  }

  /**
   * Handle get compatibility stats tool
   */
  private async handleGetCompatibilityStats() {
    const stats = this.db.getStats();

    const statsText = `# Compatibility Database Statistics\n\n` +
      `**Total Issues:** ${stats.total}\n` +
      `**Verified Issues:** ${stats.verified}\n` +
      `**Failed Combinations:** ${stats.failed}\n` +
      `**Warning Combinations:** ${stats.warned}\n` +
      `**Passed Combinations:** ${stats.passed}\n\n` +
      `**Frameworks Covered:**\n${stats.frameworks.map(f => `- ${f}`).join('\n')}\n\n` +
      `**Last Updated:** ${new Date(stats.lastUpdated).toLocaleString()}\n` +
      `**Database Integrity:** ${stats.merkleRoot.substring(0, 16)}...\n\n` +
      `**Success Rate:** ${stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0}%`;

    return {
      content: [
        {
          type: 'text',
          text: statsText,
        },
      ],
    };
  }

  /**
   * Simple version matching utility
   */
  private matchesVersion(version: string, constraint: string): boolean {
    // Simple implementation - could be enhanced with proper semver
    if (constraint.includes('^')) {
      const baseVersion = constraint.replace('^', '');
      const baseParts = baseVersion.split('.');
      const versionParts = version.split('.');
      return versionParts[0] === baseParts[0] && versionParts[1] === baseParts[1];
    }

    if (constraint.includes('~')) {
      const baseVersion = constraint.replace('~', '');
      const baseParts = baseVersion.split('.');
      const versionParts = version.split('.');
      return versionParts[0] === baseParts[0] && versionParts[1] === baseParts[1];
    }

    return version === constraint || version.startsWith(constraint);
  }
}
