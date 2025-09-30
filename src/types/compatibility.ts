/**
 * Compatibility Issue Schema
 * Merkle DAG Node: compatibility_data_types
 *
 * Defines the structure for dependency compatibility data.
 * Each compatibility issue represents a node in our dependency graph.
 */

export interface CompatibilityIssue {
  /** Unique identifier for this compatibility issue */
  id: string;

  /** Primary framework being tested */
  framework: string;

  /** Framework version */
  version: string;

  /** React version (if applicable) */
  react?: string;

  /** Node.js version */
  node?: string;

  /** Package manager used */
  packageManager?: 'npm' | 'yarn' | 'pnpm';

  /** Additional libraries and their versions */
  libs?: Record<string, string>;

  /** Compatibility status */
  status: 'pass' | 'fail' | 'warn';

  /** Error message or description of the issue */
  error?: string;

  /** Known workarounds or solutions */
  workaround?: string;

  /** When this issue was first reported */
  reportedAt: string;

  /** Whether this has been manually verified */
  verified: boolean;

  /** Source of the report (github-issue, ci-test, manual) */
  source: CompatibilityIssueSource;

  /** GitHub issue URL if applicable */
  issueUrl?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Merkle hash for this compatibility node */
  merkleHash?: string;
}

export type CompatibilityIssueSource = 'github-issue' | 'ci-test' | 'manual' | 'community';

export interface CompatibilityQuery {
  /** Framework to filter by */
  framework?: string;

  /** Framework version constraint */
  version?: string;

  /** React version constraint */
  react?: string;

  /** Node.js version constraint */
  node?: string;

  /** Package manager */
  packageManager?: string;

  /** Library to check compatibility with */
  lib?: string;

  /** Compatibility status filter */
  status?: 'pass' | 'fail' | 'warn';

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

export interface CompatibilityCheck {
  /** Framework and version */
  framework: string;

  /** Additional packages to check */
  packages: Record<string, string>;

  /** Environment constraints */
  environment?: {
    node?: string;
    packageManager?: string;
  };
}

export interface CompatibilityResult {
  /** Whether the combination is compatible */
  compatible: boolean;

  /** Compatibility status */
  status: 'pass' | 'fail' | 'warn';

  /** Known issues if any */
  issues: CompatibilityIssue[];

  /** Suggested workarounds */
  workarounds: string[];

  /** Confidence level in the result (0-1) */
  confidence: number;

  /** Last updated timestamp */
  lastUpdated: string;
}

export interface CompatibilityDatabase {
  /** All compatibility issues */
  issues: CompatibilityIssue[];

  /** Schema version */
  schemaVersion: string;

  /** Last updated timestamp */
  lastUpdated: string;

  /** Merkle root hash of all issues */
  merkleRoot: string;
}

/**
 * MCP Tool Definitions
 * These define the interface for AI assistant integration
 */
export interface MCPSearchCompatibilityArgs {
  query?: string;
  framework?: string;
  status?: string;
  limit?: number;
}

export interface MCPResolveCompatibilityArgs {
  framework: string;
  packages: Record<string, string>;
  environment?: {
    node?: string;
    packageManager?: string;
  };
}

export interface MCPGetCompatibilityIssuesArgs {
  ids: string[];
}

/**
 * Validation schemas using Zod for runtime type checking
 */
import { z } from 'zod';

export const CompatibilityIssueSchema = z.object({
  id: z.string().min(1),
  framework: z.string().min(1),
  version: z.string().min(1),
  react: z.string().optional(),
  node: z.string().optional(),
  packageManager: z.enum(['npm', 'yarn', 'pnpm']).optional(),
  libs: z.record(z.string()).optional(),
  status: z.enum(['pass', 'fail', 'warn']),
  error: z.string().optional(),
  workaround: z.string().optional(),
  reportedAt: z.string().datetime(),
  verified: z.boolean(),
  source: z.enum(['github-issue', 'ci-test', 'manual', 'community']),
  issueUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  merkleHash: z.string().optional(),
});

export const CompatibilityQuerySchema = z.object({
  framework: z.string().optional(),
  version: z.string().optional(),
  react: z.string().optional(),
  node: z.string().optional(),
  packageManager: z.string().optional(),
  lib: z.string().optional(),
  status: z.enum(['pass', 'fail', 'warn']).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

export const CompatibilityCheckSchema = z.object({
  framework: z.string().min(1),
  packages: z.record(z.string()),
  environment: z.object({
    node: z.string().optional(),
    packageManager: z.enum(['npm', 'yarn', 'pnpm']).optional(),
  }).optional(),
});
