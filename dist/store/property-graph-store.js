/**
 * Property Graph Store Integration
 * Merkle DAG Node: property_graph_store_integration
 *
 * Integrates Property Graph with Nix Store-like derivation system.
 * Each graph element is stored based on its derivation hash.
 */
import { PropertyGraphConverter } from '../types/compatibility-vie.js';
import { NixStoreManager, DerivationBuilder } from './derivation.js';
/**
 * Property Graph Store Manager
 * Manages property graphs in Nix Store-like fashion
 */
export class PropertyGraphStoreManager {
    storeManager;
    constructor(storeManager) {
        this.storeManager = storeManager;
    }
    /**
     * Store a property graph based on derivation
     */
    async storePropertyGraph(derivation, propertyGraph) {
        // Convert property graph to derivation result
        const result = {
            status: 'pass', // Property graphs are always "successful"
            duration: 0, // Not applicable for stored graphs
            environment: {
                nodeVersion: process.version,
                os: process.platform,
                arch: process.arch,
                timestamp: new Date().toISOString(),
            },
            verified: true,
            propertyGraph,
        };
        // Store using derivation hash
        return await this.storeManager.storeResult(derivation, result);
    }
    /**
     * Retrieve property graph by derivation hash
     */
    async getPropertyGraph(derivationHash) {
        const entry = await this.storeManager.getResult(derivationHash);
        return entry?.result.propertyGraph || null;
    }
    /**
     * Get or compute property graph (lazy evaluation)
     */
    async getOrComputePropertyGraph(derivation, computeFn) {
        const result = await this.storeManager.getOrComputeResult(derivation, async () => {
            const graph = await computeFn();
            return {
                status: 'pass',
                duration: 0,
                environment: {
                    nodeVersion: process.version,
                    os: process.platform,
                    arch: process.arch,
                    timestamp: new Date().toISOString(),
                },
                verified: true,
                propertyGraph: graph,
            };
        });
        if (!result.result.propertyGraph) {
            throw new Error('Computed result does not contain property graph');
        }
        return {
            hash: result.hash,
            graph: result.result.propertyGraph,
            cached: result.cached,
        };
    }
    /**
     * Store compatibility issues as property graph
     */
    async storeCompatibilityIssues(issues) {
        // Create derivation for compatibility data
        const derivation = new DerivationBuilder()
            .framework('shigrami', '1.0.0') // Meta framework for our system
            .metadata({
            requestedBy: 'system',
            priority: 'high',
            tags: ['compatibility-database', 'issues'],
        })
            .build();
        // Convert to property graph
        const propertyGraph = PropertyGraphConverter.toPropertyGraph(issues);
        // Store
        return await this.storePropertyGraph(derivation, propertyGraph);
    }
    /**
     * Retrieve compatibility issues from property graph
     */
    async getCompatibilityIssues(derivationHash) {
        const propertyGraph = await this.getPropertyGraph(derivationHash);
        if (!propertyGraph)
            return null;
        return PropertyGraphConverter.fromPropertyGraph(propertyGraph);
    }
    /**
     * Query property graphs by derivation patterns
     */
    async queryByDerivationPattern(pattern) {
        const allHashes = await this.storeManager.listDerivations();
        const matchingEntries = [];
        for (const hash of allHashes) {
            const entry = await this.storeManager.getResult(hash);
            if (!entry || !entry.result.propertyGraph)
                continue;
            // Check if derivation matches pattern
            if (this.derivationMatchesPattern(entry.derivation, pattern)) {
                matchingEntries.push({
                    derivationHash: hash,
                    elements: {
                        vertices: entry.result.propertyGraph.v,
                        incidents: entry.result.propertyGraph.i,
                        events: entry.result.propertyGraph.e,
                    },
                    metadata: {
                        created: entry.metadata.created,
                        elementCount: entry.result.propertyGraph.v.length +
                            entry.result.propertyGraph.i.length +
                            entry.result.propertyGraph.e.length,
                        derivation: entry.derivation,
                    },
                });
            }
        }
        return matchingEntries;
    }
    /**
     * Merge multiple property graphs
     */
    async mergePropertyGraphs(derivationHashes, mergeDerivation) {
        // Load all graphs
        const graphs = [];
        for (const hash of derivationHashes) {
            const graph = await this.getPropertyGraph(hash);
            if (graph)
                graphs.push(graph);
        }
        // Merge graphs (simplified - in practice would need conflict resolution)
        const mergedGraph = {
            meta: {
                graphId: `merged_${Date.now()}`,
                schemaVersion: '1.0.0',
                labels: ['Merged', 'Compatibility'],
                properties: {
                    sourceHashes: derivationHashes,
                    mergeTimestamp: new Date().toISOString(),
                },
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                statistics: {
                    vertexCount: graphs.reduce((sum, g) => sum + g.v.length, 0),
                    incidentCount: graphs.reduce((sum, g) => sum + g.i.length, 0),
                    eventCount: graphs.reduce((sum, g) => sum + g.e.length, 0),
                    labelCounts: {}, // Would need to calculate
                },
                integrity: {
                    verticesHash: '',
                    incidentsHash: '',
                    eventsHash: '',
                    fullGraphHash: '',
                },
            },
            v: graphs.flatMap(g => g.v),
            i: graphs.flatMap(g => g.i),
            e: graphs.flatMap(g => g.e),
        };
        // Store merged graph
        return await this.storePropertyGraph(mergeDerivation, mergedGraph);
    }
    /**
     * Export property graph to various formats
     */
    async exportPropertyGraph(derivationHash, format = 'json') {
        const graph = await this.getPropertyGraph(derivationHash);
        if (!graph)
            throw new Error(`Property graph not found: ${derivationHash}`);
        switch (format) {
            case 'json':
                return JSON.stringify(graph, null, 2);
            case 'jsonl':
                const lines = [];
                graph.v.forEach(v => lines.push(JSON.stringify({ type: 'vertex', data: v })));
                graph.i.forEach(i => lines.push(JSON.stringify({ type: 'incident', data: i })));
                graph.e.forEach(e => lines.push(JSON.stringify({ type: 'event', data: e })));
                return lines.join('\n');
            case 'csv':
                // Simplified CSV export
                const csvLines = ['type,id,labels,properties'];
                graph.v.forEach(v => csvLines.push(`vertex,${v.id},"${v.labels.join(';')}","${JSON.stringify(v.properties).replace(/"/g, '""')}"`));
                graph.i.forEach(i => csvLines.push(`incident,${i.id},"${i.labels.join(';')}","${JSON.stringify(i.properties).replace(/"/g, '""')}"`));
                graph.e.forEach(e => csvLines.push(`event,${e.id},"${e.labels.join(';')}","${JSON.stringify(e.properties).replace(/"/g, '""')}"`));
                return csvLines.join('\n');
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    /**
     * Get property graph diff between two versions
     */
    async diffPropertyGraphs(hash1, hash2) {
        const graph1 = await this.getPropertyGraph(hash1);
        const graph2 = await this.getPropertyGraph(hash2);
        if (!graph1 || !graph2) {
            throw new Error('One or both property graphs not found');
        }
        // Simple diff implementation (would need more sophisticated diffing in practice)
        const added = {
            vertices: graph2.v.filter(v2 => !graph1.v.find(v1 => v1.id === v2.id)),
            incidents: graph2.i.filter(i2 => !graph1.i.find(i1 => i1.id === i2.id)),
            events: graph2.e.filter(e2 => !graph1.e.find(e1 => e1.id === e2.id)),
        };
        const removed = {
            vertices: graph1.v.filter(v1 => !graph2.v.find(v2 => v2.id === v1.id)),
            incidents: graph1.i.filter(i1 => !graph2.i.find(i2 => i2.id === i1.id)),
            events: graph1.e.filter(e1 => !graph2.e.find(e2 => e2.id === e1.id)),
        };
        // Modified: vertices that exist in both but have different properties
        const modified = {
            vertices: graph2.v.filter(v2 => {
                const v1 = graph1.v.find(v => v.id === v2.id);
                return v1 && JSON.stringify(v1.properties) !== JSON.stringify(v2.properties);
            }),
            incidents: graph2.i.filter(i2 => {
                const i1 = graph1.i.find(i => i.id === i2.id);
                return i1 && JSON.stringify(i1.properties) !== JSON.stringify(i2.properties);
            }),
            events: graph2.e.filter(e2 => {
                const e1 = graph1.e.find(e => e.id === e2.id);
                return e1 && JSON.stringify(e1.properties) !== JSON.stringify(e2.properties);
            }),
        };
        return { added, removed, modified };
    }
    derivationMatchesPattern(derivation, pattern) {
        if (pattern.framework) {
            if (derivation.framework.name !== pattern.framework.name ||
                (pattern.framework.version && derivation.framework.version !== pattern.framework.version)) {
                return false;
            }
        }
        if (pattern.react && derivation.react !== pattern.react)
            return false;
        if (pattern.node && derivation.node !== pattern.node)
            return false;
        if (pattern.packageManager && derivation.packageManager !== pattern.packageManager)
            return false;
        if (pattern.libraries) {
            for (const [lib, version] of Object.entries(pattern.libraries)) {
                if (!derivation.libraries?.[lib] || derivation.libraries[lib] !== version) {
                    return false;
                }
            }
        }
        return true;
    }
}
/**
 * High-level Property Graph Store API
 * Provides convenient methods for common operations
 */
export class PropertyGraphStore {
    manager;
    constructor(storePath = '@store') {
        const storeManager = new NixStoreManager(storePath);
        this.manager = new PropertyGraphStoreManager(storeManager);
    }
    async initialize() {
        await this.manager['storeManager'].initialize();
    }
    /**
     * Store compatibility issues
     */
    async storeCompatibilityData(issues) {
        return await this.manager.storeCompatibilityIssues(issues);
    }
    /**
     * Retrieve compatibility issues
     */
    async getCompatibilityData(hash) {
        return await this.manager.getCompatibilityIssues(hash);
    }
    /**
     * Query stored graphs
     */
    async queryStoredGraphs(pattern) {
        return await this.manager.queryByDerivationPattern(pattern);
    }
    /**
     * Get store statistics
     */
    async getStoreStats() {
        return await this.manager['storeManager'].getStatistics();
    }
    /**
     * Export graph in different formats
     */
    async exportGraph(hash, format = 'json') {
        return await this.manager.exportPropertyGraph(hash, format);
    }
    /**
     * Get derivation hash for a derivation
     */
    getDerivationHash(derivation) {
        return NixStoreManager.computeDerivationHash(derivation);
    }
    /**
     * Create derivation builder
     */
    createDerivation() {
        return new DerivationBuilder();
    }
}
