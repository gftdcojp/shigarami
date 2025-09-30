/**
 * Compatibility Issue Schema
 * Merkle DAG Node: compatibility_data_types
 *
 * Defines the structure for dependency compatibility data.
 * Each compatibility issue represents a node in our dependency graph.
 */
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
