/**
 * Incidence Graph Compatibility Schema
 * Merkle DAG Node: compatibility_incidence_graph_types
 *
 * Defines the structure for the incidence graph-based compatibility data.
 * This schema represents compatibility rules as a hypergraph.
 */

// Meta information for the compatibility data file.
export interface IncidenceGraphMeta {
  schema: number;
  name: string;
  version: string;
  source: string;
  envKey: string; // Represents the environment this file was generated/tested for.
}

// Vertex in the incidence graph. Can be a package or an environment.
export interface Vertex {
  id: string; // e.g., "pkg:next@15", "env:node20-linux-x64"
}

// Collection of all vertices, categorized.
export interface VertexSet {
  packages: Vertex[];
  envs: Vertex[];
  // Future vertex types can be added here.
}

// Edge (Hyperedge) in the incidence graph, representing a single compatibility rule.
export interface Edge {
  id: string; // e.g., "rule:r1"
  prio?: number;
  reason?: string;
  expiresAt?: string; // ISO 8601 date string
}

// Incidence relation, connecting a Vertex to an Edge with a specific role.
export interface Incidence {
  v: string; // Vertex ID
  e: string; // Edge ID
  role: 'ifAll' | 'ifAny' | 'then' | 'thenNot' | 'scope' | 'suggest';
}

// The complete schema for an incidence graph compatibility file.
export interface IncidenceGraph {
  meta: IncidenceGraphMeta;
  v: VertexSet;
  e: Edge[];
  i: Incidence[];
}

// Represents a violation of a compatibility rule.
export interface Violation {
  rule: string; // Edge ID of the violated rule
  because: {
    ifAll?: string[];
    ifAny?: string[];
    then?: string;
    thenNot?: string;
  };
  found: string;
  suggest?: string[];
  prio?: number;
}

// The output format for the checker.
export interface ViolationReport {
  violations: Violation[];
}
