/**
 * Kaito Command for Shigarami
 *
 * Manages reproducible compatibility experiments.
 */

import type { CompatibilityIssueSource } from '../types/compatibility.js';

// --- Data Models ---

export interface KaitoConfig {
  readonly name: string;
  readonly template: string;
  readonly environment: {
    readonly node: string;
    readonly nodePackageManager: string;
  };
  readonly dependencies: {
    readonly framework: string;
    readonly react?: string;
    readonly libs?: Record<string, string>;
  };
  readonly script: string;
}

export interface KaitoRunResult {
  readonly experimentHash: string;
  readonly config: KaitoConfig;
  readonly status: 'pass' | 'fail' | 'warn';
  readonly logs: {
    readonly install: {
      readonly stdout: string;
      readonly stderr: string;
      readonly exitCode: number;
    };
    readonly build: {
      readonly stdout: string;
      readonly stderr: string;
      readonly exitCode: number;
    };
  };
  readonly duration: number; // in seconds
}

// --- Helpers ---

export const parsePkg = (pkg: string): { name: string; version: string } => {
  const lastAt = pkg.lastIndexOf('@');
  if (lastAt <= 0) return { name: pkg, version: 'latest' };
  return {
    name: pkg.substring(0, lastAt),
    version: pkg.substring(lastAt + 1),
  };
};