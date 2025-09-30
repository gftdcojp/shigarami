/**
 * Compatibility Issue Schema - Property Graph: v,i,e,meta
 * Merkle DAG Node: compatibility_data_property_graph
 *
 * Property graph representation optimized for LLM encode/decode.
 * Each element (v,i,e,meta) carries rich properties for enhanced reasoning.
 *
 * Property Graph Structure:
 * - v: vertices (nodes) with properties and labels
 * - i: incidents/edges (relationships) with properties and labels
 * - e: events (temporal changes) with properties and labels
 * - meta: metadata (graph-level information) with properties
 */
/**
 * Vertex (v) - Property Graph Node
 * Rich entity representation with labels and properties
 */
export interface PropertyVertex {
    /** Unique vertex identifier */
    id: string;
    /** Vertex labels (types/categories) */
    labels: string[];
    /** Vertex properties (key-value pairs) */
    properties: Record<string, PropertyValue>;
    /** Creation timestamp */
    created: string;
    /** Last update timestamp */
    updated: string;
    /** Merkle hash for data integrity */
    hash: string;
}
/**
 * Incident/Edge (i) - Property Graph Relationship
 * Rich relationship representation with labels and properties
 */
export interface PropertyIncident {
    /** Unique incident identifier */
    id: string;
    /** Source vertex ID */
    from: string;
    /** Target vertex ID */
    to: string;
    /** Relationship labels */
    labels: string[];
    /** Relationship properties */
    properties: Record<string, PropertyValue>;
    /** Creation timestamp */
    created: string;
    /** Weight/strength of relationship (0-1) */
    weight: number;
    /** Relationship directionality */
    directed: boolean;
}
/**
 * Event (e) - Property Graph Temporal Event
 * Rich temporal event representation with properties
 */
export interface PropertyEvent {
    /** Unique event identifier */
    id: string;
    /** Vertex this event affects */
    vertexId: string;
    /** Event labels */
    labels: string[];
    /** Event properties */
    properties: Record<string, PropertyValue>;
    /** Event timestamp */
    timestamp: string;
    /** Event sequence number (for ordering) */
    sequence: number;
    /** Previous state (for state changes) */
    prevState?: Record<string, PropertyValue>;
    /** New state (for state changes) */
    newState?: Record<string, PropertyValue>;
}
/**
 * Meta (meta) - Graph Metadata
 * Rich metadata for the entire property graph
 */
export interface PropertyMeta {
    /** Graph identifier */
    graphId: string;
    /** Schema version */
    schemaVersion: string;
    /** Graph labels */
    labels: string[];
    /** Graph properties */
    properties: Record<string, PropertyValue>;
    /** Creation timestamp */
    created: string;
    /** Last update timestamp */
    updated: string;
    /** Statistics */
    statistics: {
        vertexCount: number;
        incidentCount: number;
        eventCount: number;
        labelCounts: Record<string, number>;
    };
    /** Data integrity hashes */
    integrity: {
        verticesHash: string;
        incidentsHash: string;
        eventsHash: string;
        fullGraphHash: string;
    };
}
/**
 * Property Value Types
 * Flexible property value representation for property graph
 */
export type PropertyValue = string | number | boolean | null | PropertyValue[] | Record<string, PropertyValue>;
/**
 * Complete Property Graph: v,i,e,meta
 * Full property graph representation with rich metadata
 */
export interface PropertyGraph {
    /** Graph metadata */
    meta: PropertyMeta;
    /** All vertices (v) */
    v: PropertyVertex[];
    /** All incidents/edges (i) */
    i: PropertyIncident[];
    /** All events (e) */
    e: PropertyEvent[];
}
/**
 * Legacy VIE Graph (for backward compatibility)
 */
export interface CompatibilityVIEGraph {
    /** Schema version */
    schemaVersion: string;
    /** All vertices */
    v: CompatibilityVertex[];
    /** All incidents (relationships) */
    i: CompatibilityIncident[];
    /** All events (temporal changes) */
    e: CompatibilityEvent[];
    /** Graph metadata */
    metadata: {
        created: string;
        lastUpdated: string;
        totalVertices: number;
        totalIncidents: number;
        totalEvents: number;
        merkleRoot: string;
    };
}
/**
 * Legacy Vertex/Incident/Event types (for backward compatibility)
 */
export interface CompatibilityVertex {
    vid: string;
    type: 'issue' | 'framework' | 'library' | 'environment';
    props: Record<string, any>;
    hash?: string;
}
export interface CompatibilityIncident {
    iid: string;
    from: string;
    to: string;
    type: 'depends_on' | 'conflicts_with' | 'works_with' | 'reported_in' | 'affects';
    props: Record<string, any>;
    weight: number;
}
export interface CompatibilityEvent {
    eid: string;
    vertex: string;
    type: 'reported' | 'verified' | 'updated' | 'resolved' | 'failed';
    timestamp: string;
    props: Record<string, any>;
    prevState?: any;
    newState?: any;
}
/**
 * Property Graph Converter
 * Converts between object-based and property graph formats
 */
export declare class PropertyGraphConverter {
    private static sequenceCounter;
    /**
     * Convert object-based issues to property graph
     */
    static toPropertyGraph(issues: any[]): PropertyGraph;
    /**
     * Convert property graph back to object-based issues
     */
    static fromPropertyGraph(graph: PropertyGraph): any[];
    private static generateHash;
    private static generateMerkleRoot;
    private static categorizeFramework;
    private static calculateLabelCounts;
}
/**
 * Legacy VIE Converter (for backward compatibility)
 */
export declare class CompatibilityVIEConverter {
    /**
     * Convert object-based issues to v,i,e graph
     */
    static toVIEGraph(issues: any[]): CompatibilityVIEGraph;
    /**
     * Convert v,i,e graph back to object-based issues
     */
    static fromVIEGraph(graph: CompatibilityVIEGraph): any[];
    private static generateHash;
    private static generateMerkleRoot;
}
/**
 * LLM-optimized Property Graph Query Interface
 * Rich query capabilities for property graph traversal
 */
export interface PropertyGraphQuery {
    /** Target vertices (v) */
    vertices?: {
        labels?: string[];
        properties?: Record<string, PropertyQuery>;
    };
    /** Target incidents/edges (i) */
    incidents?: {
        labels?: string[];
        from?: string;
        to?: string;
        properties?: Record<string, PropertyQuery>;
        weight?: {
            min?: number;
            max?: number;
        };
        directed?: boolean;
    };
    /** Target events (e) */
    events?: {
        labels?: string[];
        vertexId?: string;
        properties?: Record<string, PropertyQuery>;
        timestamp?: {
            before?: string;
            after?: string;
        };
        sequence?: {
            min?: number;
            max?: number;
        };
    };
    /** Meta filters */
    meta?: {
        labels?: string[];
        properties?: Record<string, PropertyQuery>;
    };
    /** Result limits and pagination */
    limit?: number;
    offset?: number;
    /** Sorting */
    sortBy?: {
        field: 'created' | 'updated' | 'weight' | 'sequence';
        order: 'asc' | 'desc';
    };
    /** Include related elements */
    includeRelated?: {
        depth?: number;
        direction?: 'in' | 'out' | 'both';
        labels?: string[];
    };
}
/**
 * Property Query Operators
 * Flexible property matching for rich queries
 */
export interface PropertyQuery {
    /** Exact match */
    eq?: PropertyValue;
    /** Not equal */
    neq?: PropertyValue;
    /** Greater than */
    gt?: number;
    /** Greater than or equal */
    gte?: number;
    /** Less than */
    lt?: number;
    /** Less than or equal */
    lte?: number;
    /** In array */
    in?: PropertyValue[];
    /** Not in array */
    nin?: PropertyValue[];
    /** Contains substring (for strings) */
    contains?: string;
    /** Starts with (for strings) */
    startsWith?: string;
    /** Ends with (for strings) */
    endsWith?: string;
    /** Regex match */
    regex?: string;
    /** Exists (true) or not exists (false) */
    exists?: boolean;
}
/**
 * Property Graph Query Result
 * Structured results from property graph queries
 */
export interface PropertyGraphResult {
    /** Matched vertices */
    vertices: PropertyVertex[];
    /** Matched incidents */
    incidents: PropertyIncident[];
    /** Matched events */
    events: PropertyEvent[];
    /** Related elements (if includeRelated was specified) */
    related?: {
        vertices: PropertyVertex[];
        incidents: PropertyIncident[];
        events: PropertyEvent[];
    };
    /** Query metadata */
    metadata: {
        totalVertices: number;
        totalIncidents: number;
        totalEvents: number;
        executionTime: number;
        queryHash: string;
    };
}
/**
 * Property Graph Query Engine
 * LLM-friendly query processing for property graphs
 */
export declare class PropertyGraphQueryEngine {
    private graph;
    constructor(graph: PropertyGraph);
    /**
     * Execute property graph query
     */
    query(q: PropertyGraphQuery): PropertyGraphResult;
    /**
     * Natural language query processing
     * Converts natural language to PropertyGraphQuery
     */
    naturalLanguageQuery(nlQuery: string): Promise<PropertyGraphResult>;
    private filterVertices;
    private filterIncidents;
    private filterEvents;
    private matchesPropertyQuery;
    private findRelatedElements;
    private sortVertices;
    private sortIncidents;
    private sortEvents;
    private generateQueryHash;
}
/**
 * Legacy VIE Query (for backward compatibility)
 */
export interface VIEQuery {
    vertices?: {
        type?: string;
        props?: Record<string, any>;
    };
    incidents?: {
        type?: string;
        from?: string;
        to?: string;
        weight?: {
            min?: number;
            max?: number;
        };
    };
    events?: {
        type?: string;
        vertex?: string;
        timestamp?: {
            before?: string;
            after?: string;
        };
    };
    limit?: number;
    offset?: number;
}
