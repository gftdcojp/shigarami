/**
 * Compatibility Database Manager
 * Merkle DAG Node: data_processor
 *
 * Manages the storage, retrieval, and validation of compatibility data.
 * Ensures data integrity through merkle hashing and schema validation.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  CompatibilityIssue,
  CompatibilityQuery,
  CompatibilityDatabase,
  CompatibilityIssueSchema,
} from '../types/compatibility.js';

export class CompatibilityDatabaseManager {
  private dataDir: string;
  private cache: Map<string, CompatibilityIssue> = new Map();
  private merkleTree: Map<string, string> = new Map();

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
  }

  /**
   * Initialize the database by loading all compatibility issues
   */
  async initialize(): Promise<void> {
    await this.ensureDataDirectory();
    await this.loadAllIssues();
    this.buildMerkleTree();
  }

  /**
   * Load all compatibility issues from disk
   */
  private async loadAllIssues(): Promise<void> {
    try {
      const files = await fs.readdir(this.dataDir);
      const issueFiles = files.filter(f => f.endsWith('.json') && f !== 'database.json' && f !== 'compat-incidence-graph.json');

      const loadPromises = issueFiles.map(async (file) => {
        try {
          const filePath = path.join(this.dataDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const issue = JSON.parse(content);

          // Validate against schema
          const validatedIssue = CompatibilityIssueSchema.parse(issue);
          this.cache.set(validatedIssue.id, validatedIssue);
        } catch (error) {
          console.warn(`Failed to load issue from ${file}:`, error);
        }
      });

      await Promise.all(loadPromises);
    } catch (error) {
      console.error('Failed to load compatibility issues:', error);
      throw error;
    }
  }

  /**
   * Build merkle tree for data integrity verification
   */
  private buildMerkleTree(): void {
    const issues = Array.from(this.cache.values()).sort((a, b) => a.id.localeCompare(b.id));

    for (const issue of issues) {
      const hashInput = JSON.stringify({
        id: issue.id,
        framework: issue.framework,
        version: issue.version,
        status: issue.status,
        verified: issue.verified,
      });
      const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
      this.merkleTree.set(issue.id, hash);
    }
  }

  /**
   * Calculate merkle root of all issues
   */
  private calculateMerkleRoot(): string {
    const hashes = Array.from(this.merkleTree.values()).sort();
    if (hashes.length === 0) return '';

    let currentHashes = hashes;
    while (currentHashes.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentHashes.length; i += 2) {
        const left = currentHashes[i];
        const right = currentHashes[i + 1] || left; // Duplicate last hash if odd number
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }
      currentHashes = nextLevel;
    }

    return currentHashes[0];
  }

  /**
   * Query compatibility issues with filtering
   */
  async queryIssues(query: CompatibilityQuery): Promise<CompatibilityIssue[]> {
    let issues = Array.from(this.cache.values());

    // Apply filters
    if (query.framework) {
      issues = issues.filter(i => i.framework === query.framework);
    }

    if (query.version) {
      issues = issues.filter(i => this.matchesVersion(i.version, query.version!));
    }

    if (query.react) {
      issues = issues.filter(i => i.react && this.matchesVersion(i.react, query.react!));
    }

    if (query.node) {
      issues = issues.filter(i => i.node && this.matchesVersion(i.node, query.node!));
    }

    if (query.lib) {
      issues = issues.filter(i =>
        i.libs && Object.keys(i.libs).some(lib =>
          lib.includes(query.lib!) ||
          (i.libs![lib] && i.libs![lib].includes(query.lib!))
        )
      );
    }

    if (query.status) {
      issues = issues.filter(i => i.status === query.status);
    }

    // Sort by relevance and recency
    issues.sort((a, b) => {
      // Verified issues first
      if (a.verified !== b.verified) {
        return a.verified ? -1 : 1;
      }
      // Then by reported date (newest first)
      return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
    });

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;

    return issues.slice(offset, offset + limit);
  }

  /**
   * Get a specific compatibility issue by ID
   */
  async getIssue(id: string): Promise<CompatibilityIssue | null> {
    return this.cache.get(id) || null;
  }

  /**
   * Add or update a compatibility issue
   */
  async saveIssue(issue: CompatibilityIssue): Promise<void> {
    // Validate the issue
    const validatedIssue = CompatibilityIssueSchema.parse(issue);

    // Generate ID if not provided
    if (!validatedIssue.id) {
      validatedIssue.id = this.generateIssueId(validatedIssue);
    }

    // Calculate merkle hash
    const hashInput = JSON.stringify({
      id: validatedIssue.id,
      framework: validatedIssue.framework,
      version: validatedIssue.version,
      status: validatedIssue.status,
      verified: validatedIssue.verified,
    });
    validatedIssue.merkleHash = crypto.createHash('sha256')
      .update(hashInput)
      .digest('hex');

    // Save to cache
    this.cache.set(validatedIssue.id, validatedIssue);

    // Update merkle tree
    this.merkleTree.set(validatedIssue.id, validatedIssue.merkleHash);

    // Save to disk
    const filePath = path.join(this.dataDir, `${validatedIssue.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(validatedIssue, null, 2));

    // Update database metadata
    await this.saveDatabaseMetadata();
  }

  /**
   * Delete a compatibility issue
   */
  async deleteIssue(id: string): Promise<boolean> {
    if (!this.cache.has(id)) {
      return false;
    }

    // Remove from cache and merkle tree
    this.cache.delete(id);
    this.merkleTree.delete(id);

    // Remove from disk
    const filePath = path.join(this.dataDir, `${id}.json`);
    try {
      await fs.unlink(filePath);
      await this.saveDatabaseMetadata();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export the entire database
   */
  async exportDatabase(): Promise<CompatibilityDatabase> {
    const issues = Array.from(this.cache.values());

    return {
      issues,
      schemaVersion: '1.0.0',
      lastUpdated: new Date().toISOString(),
      merkleRoot: this.calculateMerkleRoot(),
    };
  }

  /**
   * Get database statistics
   */
  getStats() {
    const issues = Array.from(this.cache.values());
    const stats = {
      total: issues.length,
      verified: issues.filter(i => i.verified).length,
      failed: issues.filter(i => i.status === 'fail').length,
      warned: issues.filter(i => i.status === 'warn').length,
      passed: issues.filter(i => i.status === 'pass').length,
      frameworks: [...new Set(issues.map(i => i.framework))].sort(),
      lastUpdated: Math.max(...issues.map(i => new Date(i.reportedAt).getTime())),
      merkleRoot: this.calculateMerkleRoot(),
    };

    return stats;
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * Save database metadata
   */
  private async saveDatabaseMetadata(): Promise<void> {
    const metadata = {
      schemaVersion: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalIssues: this.cache.size,
      merkleRoot: this.calculateMerkleRoot(),
      stats: this.getStats(),
    };

    const filePath = path.join(this.dataDir, 'database.json');
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Generate a unique ID for a compatibility issue
   */
  private generateIssueId(issue: Partial<CompatibilityIssue>): string {
    const components = [
      issue.framework,
      issue.version,
      issue.react,
      issue.node,
      issue.packageManager,
    ].filter(Boolean);

    if (issue.libs) {
      components.push(...Object.entries(issue.libs).map(([k, v]) => `${k}@${v}`));
    }

    const hashInput = components.join('|');
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    return hash.substring(0, 16); // Use first 16 chars for readability
  }

  /**
   * Check if a version matches a constraint (simple semver matching)
   */
  private matchesVersion(version: string, constraint: string): boolean {
    // Simple implementation - could be enhanced with proper semver
    if (constraint.includes('^')) {
      const baseVersion = constraint.replace('^', '');
      return version.startsWith(baseVersion.split('.')[0] + '.' + baseVersion.split('.')[1]);
    }

    if (constraint.includes('~')) {
      const baseVersion = constraint.replace('~', '');
      return version.startsWith(baseVersion.split('.')[0] + '.' + baseVersion.split('.')[1]);
    }

    return version === constraint || version.startsWith(constraint);
  }
}
