import * as semver from 'semver';
import type {
  Edge,
  Incidence,
  IncidenceGraph,
  Violation,
  ViolationReport,
} from '../types/incidence-graph.js';

/**
 * Represents a parsed package vertex for easier matching.
 * @property name - The name of the package (e.g., 'react').
 * @property range - The semver range (e.g., '>=18.2.0 <19.0.0').
 */
type ParsedPackage = {
  name: string;
  range: string;
};

/**
 * A map of installed packages for quick lookup.
 * The key is the package name, and the value is the installed version.
 */
type InstalledPackages = Map<string, string>;

/**
 * IncidenceGraphCheckerService
 * Merkle DAG Node: incidence_graph_checker_service
 * Responsibility: Implements the logic for validating a project's dependencies
 * against a set of compatibility rules defined in an incidence graph.
 * This is a pure, stateless service that performs a linear scan over the rules.
 */
export class IncidenceGraphCheckerService {
  /**
   * Checks the project's dependencies against the provided incidence graph rules.
   *
   * @param graph - The compatibility rules defined as an incidence graph.
   * @param installedPackages - A map of installed package names to their versions.
   * @param envKey - The environment key for the current project (e.g., 'node20-linux-x64').
   * @returns A report containing all detected violations.
   */
  public check(
    graph: IncidenceGraph,
    installedPackages: InstalledPackages,
    envKey: string,
  ): ViolationReport {
    const violations: Violation[] = [];
    const ruleIncidences = this.groupIncidencesByRule(graph.i);

    for (const rule of graph.e) {
      const incidences = ruleIncidences.get(rule.id) || [];
      const ruleViolations = this.checkRule(
        rule,
        incidences,
        installedPackages,
        envKey,
      );
      violations.push(...ruleViolations);
    }

    violations.sort((a, b) => (b.prio ?? 0) - (a.prio ?? 0));

    return { violations };
  }

  /**
   * Groups all incidence relations by their rule ID (edge ID) for efficient lookup.
   */
  private groupIncidencesByRule(incidences: Incidence[]): Map<string, Incidence[]> {
    const map = new Map<string, Incidence[]>();
    for (const incidence of incidences) {
      if (!map.has(incidence.e)) {
        map.set(incidence.e, []);
      }
      map.get(incidence.e)!.push(incidence);
    }
    return map;
  }

  /**
   * Checks a single rule against the project's state.
   */
  private checkRule(
    rule: Edge,
    incidences: Incidence[],
    installedPackages: InstalledPackages,
    envKey: string,
  ): Violation[] {
    // 1. Check scope
    const scopeIncidences = incidences.filter(i => i.role === 'scope');
    if (scopeIncidences.length > 0 && !scopeIncidences.some(i => i.v === envKey)) {
      return []; // Rule is not in scope for the current environment.
    }

    // 2. Check antecedent conditions (ifAll, ifAny)
    const ifAll = incidences.filter(i => i.role === 'ifAll').map(i => i.v);
    const ifAny = incidences.filter(i => i.role === 'ifAny').map(i => i.v);

    const ifAllMet = ifAll.every(v => this.matchVertex(v, installedPackages));
    const ifAnyMet = ifAny.length === 0 || ifAny.some(v => this.matchVertex(v, installedPackages));

    if (!ifAllMet || !ifAnyMet) {
      return []; // Antecedent not met, rule does not apply.
    }

    // 3. Check consequent (then, thenNot)
    const violations: Violation[] = [];
    const thens = incidences.filter(i => i.role === 'then');
    const thenNots = incidences.filter(i => i.role === 'thenNot');
    const suggests = incidences.filter(i => i.role === 'suggest').map(i => i.v);

    for (const then of thens) {
      if (!this.matchVertex(then.v, installedPackages, true)) {
        const parsed = this.parsePackageVertex(then.v);
        const foundVersion = installedPackages.get(parsed.name);
        violations.push({
          rule: rule.id,
          because: {
            ifAll: ifAll.length > 0 ? ifAll : undefined,
            ifAny: ifAny.length > 0 ? ifAny : undefined,
            then: then.v,
          },
          found: `${parsed.name}@${foundVersion || 'not installed'}`,
          suggest: suggests,
          prio: rule.prio,
        });
      }
    }

    for (const thenNot of thenNots) {
      if (this.matchVertex(thenNot.v, installedPackages, false)) {
        const parsed = this.parsePackageVertex(thenNot.v);
        const foundVersion = installedPackages.get(parsed.name);
        violations.push({
          rule: rule.id,
          because: {
            ifAll: ifAll.length > 0 ? ifAll : undefined,
            ifAny: ifAny.length > 0 ? ifAny : undefined,
            thenNot: thenNot.v,
          },
          found: `${parsed.name}@${foundVersion || 'not found'}`,
          suggest: suggests,
          prio: rule.prio,
        });
      }
    }

    return violations;
  }

  /**
   * Matches a vertex ID against the set of installed packages.
   */
  private matchVertex(
    vertexId: string,
    installedPackages: InstalledPackages,
    matchEmpty: boolean = false,
  ): boolean {
    if (!vertexId.startsWith('pkg:')) {
      // For now, only package vertices are matched here.
      // Environment vertices are handled by the 'scope' check.
      return false;
    }

    const { name, range } = this.parsePackageVertex(vertexId);
    const installedVersion = installedPackages.get(name);

    if (!installedVersion) {
      return matchEmpty;
    }
    
    // Coerce to valid version for semver check, otherwise it throws
    const cleanVersion = semver.coerce(installedVersion);
    if (!cleanVersion) {
      return false;
    }

    return semver.satisfies(cleanVersion, range);
  }

  /**
   * Parses a package vertex ID (e.g., "pkg:react@>=18") into its name and version range.
   */
  private parsePackageVertex(vertexId: string): ParsedPackage {
    const id = vertexId.startsWith('pkg:') ? vertexId.substring(4) : vertexId;
    const lastAt = id.lastIndexOf('@');
    if (lastAt <= 0) { // Handles scoped packages like @types/react
      return { name: id, range: '*' };
    }
    const name = id.substring(0, lastAt);
    const range = id.substring(lastAt + 1);
    return { name, range: range || '*' };
  }
}
