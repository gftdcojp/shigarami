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
    source: 'github-issue' | 'ci-test' | 'manual' | 'community';
    /** GitHub issue URL if applicable */
    issueUrl?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
    /** Merkle hash for this compatibility node */
    merkleHash?: string;
}
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
export declare const CompatibilityIssueSchema: z.ZodObject<{
    id: z.ZodString;
    framework: z.ZodString;
    version: z.ZodString;
    react: z.ZodOptional<z.ZodString>;
    node: z.ZodOptional<z.ZodString>;
    packageManager: z.ZodOptional<z.ZodEnum<["npm", "yarn", "pnpm"]>>;
    libs: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    status: z.ZodEnum<["pass", "fail", "warn"]>;
    error: z.ZodOptional<z.ZodString>;
    workaround: z.ZodOptional<z.ZodString>;
    reportedAt: z.ZodString;
    verified: z.ZodBoolean;
    source: z.ZodEnum<["github-issue", "ci-test", "manual", "community"]>;
    issueUrl: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    merkleHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    framework: string;
    version: string;
    status: "pass" | "fail" | "warn";
    reportedAt: string;
    verified: boolean;
    source: "github-issue" | "ci-test" | "manual" | "community";
    react?: string | undefined;
    node?: string | undefined;
    packageManager?: "npm" | "yarn" | "pnpm" | undefined;
    libs?: Record<string, string> | undefined;
    error?: string | undefined;
    workaround?: string | undefined;
    issueUrl?: string | undefined;
    metadata?: Record<string, any> | undefined;
    merkleHash?: string | undefined;
}, {
    id: string;
    framework: string;
    version: string;
    status: "pass" | "fail" | "warn";
    reportedAt: string;
    verified: boolean;
    source: "github-issue" | "ci-test" | "manual" | "community";
    react?: string | undefined;
    node?: string | undefined;
    packageManager?: "npm" | "yarn" | "pnpm" | undefined;
    libs?: Record<string, string> | undefined;
    error?: string | undefined;
    workaround?: string | undefined;
    issueUrl?: string | undefined;
    metadata?: Record<string, any> | undefined;
    merkleHash?: string | undefined;
}>;
export declare const CompatibilityQuerySchema: z.ZodObject<{
    framework: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    react: z.ZodOptional<z.ZodString>;
    node: z.ZodOptional<z.ZodString>;
    packageManager: z.ZodOptional<z.ZodString>;
    lib: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pass", "fail", "warn"]>>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    framework?: string | undefined;
    version?: string | undefined;
    react?: string | undefined;
    node?: string | undefined;
    packageManager?: string | undefined;
    status?: "pass" | "fail" | "warn" | undefined;
    lib?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}, {
    framework?: string | undefined;
    version?: string | undefined;
    react?: string | undefined;
    node?: string | undefined;
    packageManager?: string | undefined;
    status?: "pass" | "fail" | "warn" | undefined;
    lib?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export declare const CompatibilityCheckSchema: z.ZodObject<{
    framework: z.ZodString;
    packages: z.ZodRecord<z.ZodString, z.ZodString>;
    environment: z.ZodOptional<z.ZodObject<{
        node: z.ZodOptional<z.ZodString>;
        packageManager: z.ZodOptional<z.ZodEnum<["npm", "yarn", "pnpm"]>>;
    }, "strip", z.ZodTypeAny, {
        node?: string | undefined;
        packageManager?: "npm" | "yarn" | "pnpm" | undefined;
    }, {
        node?: string | undefined;
        packageManager?: "npm" | "yarn" | "pnpm" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    framework: string;
    packages: Record<string, string>;
    environment?: {
        node?: string | undefined;
        packageManager?: "npm" | "yarn" | "pnpm" | undefined;
    } | undefined;
}, {
    framework: string;
    packages: Record<string, string>;
    environment?: {
        node?: string | undefined;
        packageManager?: "npm" | "yarn" | "pnpm" | undefined;
    } | undefined;
}>;
