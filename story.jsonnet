/**
 * DepCompat - Dependency Compatibility Database
 * Process Network Graph Model for Project Topology
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Each node handles one aspect
 * - Open/Closed: New compatibility checks can be added without modifying core
 * - Liskov Substitution: Interface implementations are interchangeable
 * - Interface Segregation: Focused interfaces for different concerns
 * - Dependency Inversion: High-level modules don't depend on low-level modules
 *
 * Merkle DAG Structure:
 * - story.jsonnet (root): Overall project topology
 * - mcp.jsonnet: MCP server subgraph
 * - web.jsonnet: Web dashboard subgraph
 * - cli.jsonnet: CLI tools subgraph
 * - data.jsonnet: Database management subgraph
 */

// Core project metadata - Merkle root for the entire project
local project = {
  name: 'shigrami',
  version: '0.1.0',
  description: 'Dependency Compatibility Database - Context7-like system',
  license: 'Apache-2.0',
  author: 'Jun Kawasaki',
  repository: 'https://github.com/junkawasaki/shigrami',
  keywords: [
    'dependencies',
    'compatibility',
    'npm',
    'peer-dependencies',
    'mcp',
    'context7'
  ],
};

// Process network nodes - each represents a subsystem with merkle hash
local nodes = {
  // Data processing layer - foundation of the DAG
  data_processor: {
    id: 'data_processor',
    responsibility: 'Manage compatibility data storage and retrieval',
    dependencies: [],
    provides: ['data_storage', 'data_validation', 'data_query'],
    merkle_hash: std.md5('data_processor_v1'),
    subgraph: import 'subgraphs/data.jsonnet',
  },

  // MCP server - AI integration layer
  mcp_server: {
    id: 'mcp_server',
    responsibility: 'Provide compatibility data via Model Context Protocol',
    dependencies: ['data_processor'],
    provides: ['mcp_tools', 'ai_integration'],
    merkle_hash: std.md5('mcp_server_v1'),
    subgraph: import 'subgraphs/mcp.jsonnet',
  },

  // Web dashboard - user interface layer
  web_dashboard: {
    id: 'web_dashboard',
    responsibility: 'Provide searchable web interface for compatibility data',
    dependencies: ['data_processor'],
    provides: ['web_ui', 'search_interface'],
    merkle_hash: std.md5('web_dashboard_v1'),
    subgraph: import 'subgraphs/web.jsonnet',
  },

  // CLI tools - developer interface layer
  cli_tools: {
    id: 'cli_tools',
    responsibility: 'Command-line interface for compatibility checking and experimental runs',
    dependencies: ['data_processor'],
    provides: ['cli_commands', 'automation', 'kaito_experiments'],
    merkle_hash: std.md5('cli_tools_v2'),
    subgraph: import 'subgraphs/cli.jsonnet',
  },

  // CI integration - automation layer
  ci_integration: {
    id: 'ci_integration',
    responsibility: 'Automated testing and CI/CD integration',
    dependencies: ['data_processor', 'cli_tools'],
    provides: ['automated_testing', 'ci_checks'],
    merkle_hash: std.md5('ci_integration_v1'),
    subgraph: import 'subgraphs/ci.jsonnet',
  },
};

// Process network edges - define data flow and dependencies
local edges = [
  // Data flow from storage to consumers
  {
    from: 'data_processor',
    to: 'mcp_server',
    data_type: 'compatibility_data',
    protocol: 'json_rpc',
  },
  {
    from: 'data_processor',
    to: 'web_dashboard',
    data_type: 'compatibility_data',
    protocol: 'http_api',
  },
  {
    from: 'data_processor',
    to: 'cli_tools',
    data_type: 'compatibility_data',
    protocol: 'direct_api',
  },

  // CI depends on CLI for automated checks
  {
    from: 'cli_tools',
    to: 'ci_integration',
    data_type: 'test_results',
    protocol: 'stdout',
  },
];

// Topological sort validation - ensure no circular dependencies
local validate_topology() = {
  local node_ids = std.set(std.map(function(n) n.id, std.objectValues(nodes))),
  local edge_pairs = std.map(function(e) [e.from, e.to], edges),

  // Check for circular dependencies using Kahn's algorithm
  local incoming = std.foldl(
    function(acc, edge) acc { [edge[1]]: (acc[edge[1]] + 1) },
    edge_pairs,
    {}
  ),

  local queue = std.filter(function(id) !std.objectHas(incoming, id), node_ids),
  local processed = [],

  local process_queue(queue, processed, remaining_edges):
    if std.length(queue) == 0 then
      if std.length(remaining_edges) > 0 then
        error 'Circular dependency detected in process network'
      else
        true
    else
      local current = queue[0],
      local new_queue = queue[1:],
      local affected_edges = std.filter(function(e) e[0] == current, remaining_edges),
      local new_processed = processed + [current],

      // Update incoming counts for affected nodes
      local updated_incoming = std.foldl(
        function(acc, edge)
          local target = edge[1];
          if std.objectHas(acc, target) then
            acc { [target]: acc[target] - 1 }
          else
            acc,
        affected_edges,
        incoming
      ),

      // Add nodes with no remaining dependencies to queue
      local newly_available = std.filter(
        function(id)
          std.objectHas(updated_incoming, id) && updated_incoming[id] == 0 &&
          !std.member(new_processed, id),
        node_ids
      ),

      process_queue(new_queue + newly_available, new_processed,
                   std.filter(function(e) e[0] != current, remaining_edges)),

  process_queue(queue, [], edge_pairs),
};

// Build configuration - merge all subgraphs with topological ordering
local build_config = {
  local ordered_nodes = [
    'data_processor',  // Foundation
    'mcp_server',     // Can run in parallel with others
    'web_dashboard',   // Can run in parallel with CLI
    'cli_tools',       // Can run in parallel with web
    'ci_integration',  // Depends on CLI
  ],

  local validate_build_order() =
    local node_deps = std.foldl(
      function(acc, node) acc + { [node.id]: node.dependencies },
      std.objectValues(nodes),
      {}
    );

    local check_order(index, remaining):
      if index >= std.length(ordered_nodes) then
        true
      else
        local current = ordered_nodes[index],
        local deps = node_deps[current],
        local deps_satisfied = std.all(
          std.map(function(dep) std.member(ordered_nodes[:index], dep), deps)
        );

        if deps_satisfied then
          check_order(index + 1, remaining)
        else
          error 'Build order violates dependency constraints for ' + current;

    check_order(0, ordered_nodes),

  // Validate build order before proceeding
  local _ = validate_build_order(),

  // Generate merged configuration
  config: std.foldl(
    function(acc, node_id)
      local node = nodes[node_id];
      acc + node.subgraph,
    ordered_nodes,
    {
      project: project,
      topology: {
        nodes: nodes,
        edges: edges,
        validated: validate_topology(),
      },
    }
  ),
};

// Export the complete project configuration
build_config.config
