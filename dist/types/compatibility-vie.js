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
 * Property Graph Converter
 * Converts between object-based and property graph formats
 */
export class PropertyGraphConverter {
    static sequenceCounter = 0;
    /**
     * Convert object-based issues to property graph
     */
    static toPropertyGraph(issues) {
        const vertices = [];
        const incidents = [];
        const events = [];
        const now = new Date().toISOString();
        issues.forEach(issue => {
            // Create main issue vertex
            const issueVertex = {
                id: `issue_${issue.id}`,
                labels: ['Issue', 'CompatibilityIssue'],
                properties: {
                    framework: issue.framework,
                    version: issue.version,
                    status: issue.status,
                    error: issue.error || null,
                    workaround: issue.workaround || null,
                    verified: issue.verified,
                    source: issue.source,
                    reportedAt: issue.reportedAt,
                },
                created: issue.reportedAt,
                updated: now,
                hash: this.generateHash(issue),
            };
            // Add optional properties
            if (issue.react)
                issueVertex.properties.react = issue.react;
            if (issue.node)
                issueVertex.properties.node = issue.node;
            if (issue.packageManager)
                issueVertex.properties.packageManager = issue.packageManager;
            if (issue.libs)
                issueVertex.properties.libs = issue.libs;
            if (issue.issueUrl)
                issueVertex.properties.issueUrl = issue.issueUrl;
            vertices.push(issueVertex);
            // Create framework vertex if not exists
            const frameworkVid = `framework_${issue.framework}`;
            if (!vertices.find(v => v.id === frameworkVid)) {
                vertices.push({
                    id: frameworkVid,
                    labels: ['Framework'],
                    properties: {
                        name: issue.framework,
                        category: this.categorizeFramework(issue.framework),
                    },
                    created: now,
                    updated: now,
                    hash: this.generateHash({ name: issue.framework }),
                });
            }
            // Create incident: issue -> framework
            incidents.push({
                id: `incident_${issue.id}_framework`,
                from: `issue_${issue.id}`,
                to: frameworkVid,
                labels: ['ReportedIn', 'BelongsTo'],
                properties: {
                    reportedAt: issue.reportedAt,
                    confidence: 1.0,
                },
                created: issue.reportedAt,
                weight: 1.0,
                directed: true,
            });
            // Create library vertices and incidents
            if (issue.libs) {
                Object.entries(issue.libs).forEach(([lib, version]) => {
                    const libVid = `lib_${lib}`;
                    if (!vertices.find(v => v.id === libVid)) {
                        vertices.push({
                            id: libVid,
                            labels: ['Library', 'Package'],
                            properties: {
                                name: lib,
                                ecosystem: 'npm',
                            },
                            created: now,
                            updated: now,
                            hash: this.generateHash({ name: lib }),
                        });
                    }
                    // Create incident: issue -> library
                    const relationshipType = issue.status === 'fail' ? 'ConflictsWith' :
                        issue.status === 'warn' ? 'WarnsWith' : 'WorksWith';
                    incidents.push({
                        id: `incident_${issue.id}_${lib}`,
                        from: `issue_${issue.id}`,
                        to: libVid,
                        labels: [relationshipType, 'Involves'],
                        properties: {
                            version: version,
                            testedAt: issue.reportedAt,
                        },
                        created: issue.reportedAt,
                        weight: issue.status === 'fail' ? 0.8 :
                            issue.status === 'warn' ? 0.6 : 0.9,
                        directed: true,
                    });
                });
            }
            // Create environment vertices and incidents
            if (issue.react) {
                const reactVid = `env_react_${issue.react}`;
                if (!vertices.find(v => v.id === reactVid)) {
                    vertices.push({
                        id: reactVid,
                        labels: ['Environment', 'React'],
                        properties: {
                            component: 'react',
                            version: issue.react,
                            ecosystem: 'frontend',
                        },
                        created: now,
                        updated: now,
                        hash: this.generateHash({ component: 'react', version: issue.react }),
                    });
                }
                incidents.push({
                    id: `incident_${issue.id}_react`,
                    from: `issue_${issue.id}`,
                    to: reactVid,
                    labels: ['DependsOn', 'Requires'],
                    properties: {
                        required: true,
                        testedAt: issue.reportedAt,
                    },
                    created: issue.reportedAt,
                    weight: 0.7,
                    directed: true,
                });
            }
            // Create events
            this.sequenceCounter++;
            events.push({
                id: `event_${issue.id}_reported`,
                vertexId: `issue_${issue.id}`,
                labels: ['Reported', 'Created'],
                properties: {
                    source: issue.source,
                    reporter: 'community',
                },
                timestamp: issue.reportedAt,
                sequence: this.sequenceCounter,
            });
            if (issue.verified) {
                this.sequenceCounter++;
                events.push({
                    id: `event_${issue.id}_verified`,
                    vertexId: `issue_${issue.id}`,
                    labels: ['Verified', 'Validated'],
                    properties: {
                        verifiedBy: 'maintainer',
                    },
                    timestamp: issue.reportedAt,
                    sequence: this.sequenceCounter,
                    prevState: { verified: false },
                    newState: { verified: true },
                });
            }
        });
        // Create metadata
        const meta = {
            graphId: `compatibility_graph_${Date.now()}`,
            schemaVersion: '1.0.0',
            labels: ['Compatibility', 'Dependencies', 'Issues'],
            properties: {
                domain: 'javascript',
                ecosystem: 'npm',
                purpose: 'dependency_compatibility_tracking',
            },
            created: now,
            updated: now,
            statistics: {
                vertexCount: vertices.length,
                incidentCount: incidents.length,
                eventCount: events.length,
                labelCounts: this.calculateLabelCounts(vertices, incidents, events),
            },
            integrity: {
                verticesHash: this.generateMerkleRoot(vertices.map(v => ({ id: v.id, properties: v.properties }))),
                incidentsHash: this.generateMerkleRoot(incidents.map(i => ({ id: i.id, from: i.from, to: i.to, properties: i.properties }))),
                eventsHash: this.generateMerkleRoot(events.map(e => ({ id: e.id, vertexId: e.vertexId, properties: e.properties }))),
                fullGraphHash: this.generateMerkleRoot([{ vertices, incidents, events }]),
            },
        };
        return {
            meta,
            v: vertices,
            i: incidents,
            e: events,
        };
    }
    /**
     * Convert property graph back to object-based issues
     */
    static fromPropertyGraph(graph) {
        const issues = [];
        // Find issue vertices
        const issueVertices = graph.v.filter(v => v.labels.includes('Issue'));
        issueVertices.forEach(issueVertex => {
            const issueId = issueVertex.id.replace('issue_', '');
            const props = issueVertex.properties;
            // Find related incidents
            const incidents = graph.i.filter(i => i.from === issueVertex.id);
            // Extract libraries from incidents
            const libs = {};
            incidents
                .filter(i => i.labels.some(label => ['ConflictsWith', 'WarnsWith', 'WorksWith'].includes(label)))
                .forEach(incident => {
                const libVertex = graph.v.find(v => v.id === incident.to);
                if (libVertex && libVertex.labels.includes('Library')) {
                    const libName = String(libVertex.properties.name);
                    const libVersion = String(incident.properties.version);
                    libs[libName] = libVersion;
                }
            });
            // Extract react version
            const reactIncident = incidents.find(i => i.labels.includes('DependsOn') &&
                graph.v.find(v => v.id === i.to)?.labels.includes('React'));
            const reactVersion = reactIncident ?
                graph.v.find(v => v.id === reactIncident.to)?.properties.version : undefined;
            // Extract events
            const issueEvents = graph.e.filter(e => e.vertexId === issueVertex.id);
            const issue = {
                id: issueId,
                framework: props.framework,
                version: props.version,
                react: reactVersion,
                node: props.node || undefined,
                packageManager: props.packageManager || undefined,
                status: props.status,
                error: props.error,
                workaround: props.workaround,
                verified: props.verified,
                source: props.source,
                libs: Object.keys(libs).length > 0 ? libs : undefined,
                reportedAt: props.reportedAt,
                issueUrl: props.issueUrl || undefined,
            };
            issues.push(issue);
        });
        return issues;
    }
    static generateHash(obj) {
        const crypto = require('crypto');
        return crypto.createHash('sha256')
            .update(JSON.stringify(obj))
            .digest('hex')
            .substring(0, 16);
    }
    static generateMerkleRoot(items) {
        if (items.length === 0)
            return '';
        const crypto = require('crypto');
        const hashes = items.map(item => crypto.createHash('sha256')
            .update(JSON.stringify(item))
            .digest('hex'));
        // Simple merkle root calculation
        return crypto.createHash('sha256')
            .update(hashes.join(''))
            .digest('hex');
    }
    static categorizeFramework(framework) {
        const categories = {
            'next': 'react-framework',
            'astro': 'static-site-generator',
            'remix': 'react-framework',
            'svelte': 'frontend-framework',
            'vue': 'frontend-framework',
            'nuxt': 'vue-framework',
            'vite': 'build-tool',
            'webpack': 'build-tool',
            'rollup': 'build-tool',
        };
        return categories[framework] || 'unknown';
    }
    static calculateLabelCounts(vertices, incidents, events) {
        const counts = {};
        // Count vertex labels
        vertices.forEach(v => {
            v.labels.forEach(label => {
                counts[label] = (counts[label] || 0) + 1;
            });
        });
        // Count incident labels
        incidents.forEach(i => {
            i.labels.forEach(label => {
                counts[label] = (counts[label] || 0) + 1;
            });
        });
        // Count event labels
        events.forEach(e => {
            e.labels.forEach(label => {
                counts[label] = (counts[label] || 0) + 1;
            });
        });
        return counts;
    }
}
/**
 * Legacy VIE Converter (for backward compatibility)
 */
export class CompatibilityVIEConverter {
    /**
     * Convert object-based issues to v,i,e graph
     */
    static toVIEGraph(issues) {
        const vertices = [];
        const incidents = [];
        const events = [];
        issues.forEach(issue => {
            // Create main issue vertex
            const issueVertex = {
                vid: `issue_${issue.id}`,
                type: 'issue',
                props: {
                    framework: issue.framework,
                    version: issue.version,
                    status: issue.status,
                    error: issue.error,
                    workaround: issue.workaround,
                    verified: issue.verified,
                    source: issue.source,
                },
                hash: this.generateHash(issue),
            };
            vertices.push(issueVertex);
            // Create framework vertex if not exists
            const frameworkVid = `framework_${issue.framework}`;
            if (!vertices.find(v => v.vid === frameworkVid)) {
                vertices.push({
                    vid: frameworkVid,
                    type: 'framework',
                    props: { name: issue.framework },
                });
            }
            // Create incident: issue -> framework
            incidents.push({
                iid: `incident_${issue.id}_framework`,
                from: `issue_${issue.id}`,
                to: frameworkVid,
                type: 'reported_in',
                props: {},
                weight: 1.0,
            });
            // Create library vertices and incidents
            if (issue.libs) {
                Object.entries(issue.libs).forEach(([lib, version]) => {
                    const libVid = `lib_${lib}`;
                    if (!vertices.find(v => v.vid === libVid)) {
                        vertices.push({
                            vid: libVid,
                            type: 'library',
                            props: { name: lib },
                        });
                    }
                    // Create incident: issue -> library
                    incidents.push({
                        iid: `incident_${issue.id}_${lib}`,
                        from: `issue_${issue.id}`,
                        to: libVid,
                        type: issue.status === 'fail' ? 'conflicts_with' : 'works_with',
                        props: { version },
                        weight: issue.status === 'fail' ? 0.8 : issue.status === 'warn' ? 0.6 : 0.9,
                    });
                });
            }
            // Create environment vertices and incidents
            if (issue.react) {
                const reactVid = `env_react_${issue.react}`;
                if (!vertices.find(v => v.vid === reactVid)) {
                    vertices.push({
                        vid: reactVid,
                        type: 'environment',
                        props: { component: 'react', version: issue.react },
                    });
                }
                incidents.push({
                    iid: `incident_${issue.id}_react`,
                    from: `issue_${issue.id}`,
                    to: reactVid,
                    type: 'depends_on',
                    props: {},
                    weight: 0.7,
                });
            }
            // Create events
            events.push({
                eid: `event_${issue.id}_reported`,
                vertex: `issue_${issue.id}`,
                type: 'reported',
                timestamp: issue.reportedAt,
                props: { source: issue.source },
            });
            if (issue.verified) {
                events.push({
                    eid: `event_${issue.id}_verified`,
                    vertex: `issue_${issue.id}`,
                    type: 'verified',
                    timestamp: issue.reportedAt, // Assume verified at report time
                    props: {},
                });
            }
        });
        return {
            schemaVersion: '1.0.0',
            v: vertices,
            i: incidents,
            e: events,
            metadata: {
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                totalVertices: vertices.length,
                totalIncidents: incidents.length,
                totalEvents: events.length,
                merkleRoot: this.generateMerkleRoot(vertices, incidents, events),
            },
        };
    }
    /**
     * Convert v,i,e graph back to object-based issues
     */
    static fromVIEGraph(graph) {
        const issues = [];
        // Group incidents by issue
        const issueIncidents = new Map();
        graph.i.forEach(incident => {
            const issueId = incident.from.replace('issue_', '');
            if (!issueIncidents.has(issueId)) {
                issueIncidents.set(issueId, []);
            }
            issueIncidents.get(issueId).push(incident);
        });
        // Reconstruct issues
        graph.v.filter(v => v.type === 'issue').forEach(issueVertex => {
            const issueId = issueVertex.vid.replace('issue_', '');
            const incidents = issueIncidents.get(issueId) || [];
            // Extract libraries
            const libs = {};
            incidents
                .filter(i => i.type === 'conflicts_with' || i.type === 'works_with')
                .forEach(incident => {
                const libVertex = graph.v.find(v => v.vid === incident.to);
                if (libVertex && libVertex.type === 'library') {
                    libs[libVertex.props.name] = incident.props.version;
                }
            });
            // Extract react version
            const reactIncident = incidents.find(i => i.type === 'depends_on' &&
                graph.v.find(v => v.vid === i.to)?.type === 'environment');
            const reactVersion = reactIncident ?
                graph.v.find(v => v.vid === reactIncident.to)?.props.version : undefined;
            // Extract events
            const issueEvents = graph.e.filter(e => e.vertex === issueVertex.vid);
            const issue = {
                id: issueId,
                framework: issueVertex.props.framework,
                version: issueVertex.props.version,
                react: reactVersion,
                status: issueVertex.props.status,
                error: issueVertex.props.error,
                workaround: issueVertex.props.workaround,
                verified: issueVertex.props.verified,
                source: issueVertex.props.source,
                libs: Object.keys(libs).length > 0 ? libs : undefined,
                reportedAt: issueEvents.find(e => e.type === 'reported')?.timestamp || '',
            };
            issues.push(issue);
        });
        return issues;
    }
    static generateHash(obj) {
        const crypto = require('crypto');
        return crypto.createHash('sha256')
            .update(JSON.stringify(obj))
            .digest('hex')
            .substring(0, 16);
    }
    static generateMerkleRoot(v, i, e) {
        const crypto = require('crypto');
        const combined = JSON.stringify({ v, i, e });
        return crypto.createHash('sha256')
            .update(combined)
            .digest('hex');
    }
}
/**
 * Property Graph Query Engine
 * LLM-friendly query processing for property graphs
 */
export class PropertyGraphQueryEngine {
    graph;
    constructor(graph) {
        this.graph = graph;
    }
    /**
     * Execute property graph query
     */
    query(q) {
        const startTime = Date.now();
        // Query vertices
        let vertices = this.graph.v;
        if (q.vertices) {
            vertices = this.filterVertices(vertices, q.vertices);
        }
        // Query incidents
        let incidents = this.graph.i;
        if (q.incidents) {
            incidents = this.filterIncidents(incidents, q.incidents);
        }
        // Query events
        let events = this.graph.e;
        if (q.events) {
            events = this.filterEvents(events, q.events);
        }
        // Include related elements
        let related;
        if (q.includeRelated) {
            related = this.findRelatedElements(vertices, incidents, events, q.includeRelated);
        }
        // Apply sorting
        if (q.sortBy) {
            vertices = this.sortVertices(vertices, q.sortBy);
            incidents = this.sortIncidents(incidents, q.sortBy);
            events = this.sortEvents(events, q.sortBy);
        }
        // Apply pagination
        const offset = q.offset || 0;
        const limit = q.limit || 50;
        vertices = vertices.slice(offset, offset + limit);
        incidents = incidents.slice(offset, offset + limit);
        events = events.slice(offset, offset + limit);
        return {
            vertices,
            incidents,
            events,
            related,
            metadata: {
                totalVertices: vertices.length,
                totalIncidents: incidents.length,
                totalEvents: events.length,
                executionTime: Date.now() - startTime,
                queryHash: this.generateQueryHash(q),
            },
        };
    }
    /**
     * Natural language query processing
     * Converts natural language to PropertyGraphQuery
     */
    async naturalLanguageQuery(nlQuery) {
        // This would use LLM to convert natural language to PropertyGraphQuery
        // For now, return a mock implementation
        const mockQuery = {
            vertices: {
                labels: ['Issue'],
                properties: {
                    status: { eq: 'fail' },
                    framework: { contains: nlQuery.toLowerCase() },
                },
            },
            limit: 10,
        };
        return this.query(mockQuery);
    }
    filterVertices(vertices, filter) {
        return vertices.filter(v => {
            // Check labels
            if (filter.labels && !filter.labels.some(label => v.labels.includes(label))) {
                return false;
            }
            // Check properties
            if (filter.properties) {
                for (const [key, query] of Object.entries(filter.properties)) {
                    const propValue = v.properties[key];
                    if (!this.matchesPropertyQuery(propValue, query)) {
                        return false;
                    }
                }
            }
            return true;
        });
    }
    filterIncidents(incidents, filter) {
        return incidents.filter(i => {
            if (filter.labels && !filter.labels.some(label => i.labels.includes(label)))
                return false;
            if (filter.from && i.from !== filter.from)
                return false;
            if (filter.to && i.to !== filter.to)
                return false;
            if (filter.directed !== undefined && i.directed !== filter.directed)
                return false;
            if (filter.weight) {
                if (filter.weight.min !== undefined && i.weight < filter.weight.min)
                    return false;
                if (filter.weight.max !== undefined && i.weight > filter.weight.max)
                    return false;
            }
            if (filter.properties) {
                for (const [key, query] of Object.entries(filter.properties)) {
                    const propValue = i.properties[key];
                    if (!this.matchesPropertyQuery(propValue, query))
                        return false;
                }
            }
            return true;
        });
    }
    filterEvents(events, filter) {
        return events.filter(e => {
            if (filter.labels && !filter.labels.some(label => e.labels.includes(label)))
                return false;
            if (filter.vertexId && e.vertexId !== filter.vertexId)
                return false;
            if (filter.timestamp) {
                const eventTime = new Date(e.timestamp).getTime();
                if (filter.timestamp.before && eventTime >= new Date(filter.timestamp.before).getTime())
                    return false;
                if (filter.timestamp.after && eventTime <= new Date(filter.timestamp.after).getTime())
                    return false;
            }
            if (filter.sequence) {
                if (filter.sequence.min !== undefined && e.sequence < filter.sequence.min)
                    return false;
                if (filter.sequence.max !== undefined && e.sequence > filter.sequence.max)
                    return false;
            }
            if (filter.properties) {
                for (const [key, query] of Object.entries(filter.properties)) {
                    const propValue = e.properties[key];
                    if (!this.matchesPropertyQuery(propValue, query))
                        return false;
                }
            }
            return true;
        });
    }
    matchesPropertyQuery(value, query) {
        if (query.eq !== undefined)
            return value === query.eq;
        if (query.neq !== undefined)
            return value !== query.neq;
        if (query.exists !== undefined)
            return (value !== null && value !== undefined) === query.exists;
        if (typeof value === 'string') {
            if (query.contains)
                return value.includes(query.contains);
            if (query.startsWith)
                return value.startsWith(query.startsWith);
            if (query.endsWith)
                return value.endsWith(query.endsWith);
            if (query.regex)
                return new RegExp(query.regex).test(value);
        }
        if (typeof value === 'number') {
            if (query.gt !== undefined && value <= query.gt)
                return false;
            if (query.gte !== undefined && value < query.gte)
                return false;
            if (query.lt !== undefined && value >= query.lt)
                return false;
            if (query.lte !== undefined && value > query.lte)
                return false;
        }
        if (query.in && Array.isArray(query.in))
            return query.in.includes(value);
        if (query.nin && Array.isArray(query.nin))
            return !query.nin.includes(value);
        return true;
    }
    findRelatedElements(vertices, incidents, events, config) {
        // Simple breadth-first traversal
        const visitedVertices = new Set(vertices.map(v => v.id));
        const visitedIncidents = new Set(incidents.map(i => i.id));
        const visitedEvents = new Set(events.map(e => e.id));
        const relatedVertices = [];
        const relatedIncidents = [];
        const relatedEvents = [];
        // For simplicity, just traverse one level
        // In a full implementation, this would do proper graph traversal
        vertices.forEach(vertex => {
            // Find incidents connected to this vertex
            this.graph.i.forEach(incident => {
                if ((incident.from === vertex.id || incident.to === vertex.id) && !visitedIncidents.has(incident.id)) {
                    relatedIncidents.push(incident);
                    visitedIncidents.add(incident.id);
                    // Find connected vertices
                    [incident.from, incident.to].forEach(vid => {
                        if (!visitedVertices.has(vid)) {
                            const connectedVertex = this.graph.v.find(v => v.id === vid);
                            if (connectedVertex) {
                                relatedVertices.push(connectedVertex);
                                visitedVertices.add(vid);
                            }
                        }
                    });
                }
            });
            // Find events for this vertex
            this.graph.e.forEach(event => {
                if (event.vertexId === vertex.id && !visitedEvents.has(event.id)) {
                    relatedEvents.push(event);
                    visitedEvents.add(event.id);
                }
            });
        });
        return {
            vertices: relatedVertices,
            incidents: relatedIncidents,
            events: relatedEvents,
        };
    }
    sortVertices(vertices, sort) {
        return [...vertices].sort((a, b) => {
            let aVal, bVal;
            switch (sort.field) {
                case 'created':
                    aVal = new Date(a.created);
                    bVal = new Date(b.created);
                    break;
                case 'updated':
                    aVal = new Date(a.updated);
                    bVal = new Date(b.updated);
                    break;
                default:
                    return 0;
            }
            if (sort.order === 'desc') {
                return bVal.getTime() - aVal.getTime();
            }
            else {
                return aVal.getTime() - bVal.getTime();
            }
        });
    }
    sortIncidents(incidents, sort) {
        if (sort.field === 'weight') {
            return [...incidents].sort((a, b) => {
                return sort.order === 'desc' ? b.weight - a.weight : a.weight - b.weight;
            });
        }
        return incidents;
    }
    sortEvents(events, sort) {
        if (sort.field === 'sequence') {
            return [...events].sort((a, b) => {
                return sort.order === 'desc' ? b.sequence - a.sequence : a.sequence - b.sequence;
            });
        }
        return events;
    }
    generateQueryHash(query) {
        const crypto = require('crypto');
        return crypto.createHash('sha256')
            .update(JSON.stringify(query))
            .digest('hex')
            .substring(0, 16);
    }
}
