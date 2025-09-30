/**
 * CLI Interface for DepCompat
 * Merkle DAG Node: cli_tools
 *
 * Command-line interface for interacting with the compatibility database.
 * Provides commands for checking compatibility, reporting issues, and managing data.
 */
import { table } from 'table';
import { ResolverService } from '../services/resolver.js';
import { GitHubStoreClient } from '../store/github-store.js';
import { IncidenceGraphCheckerService } from '../services/incidence-graph-checker.js';
import fs from 'fs/promises';
import path from 'path';
export class CLI {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Check project compatibility using an incidence graph.
     * Merkle DAG Edge: cli_tools -> incidence_graph_checker_service
     */
    async checkIncidenceGraph(options) {
        const projectRoot = options.projectRoot || process.cwd();
        const rulesFile = options.rulesFile || path.join(projectRoot, 'compat-rules.json');
        console.log(`🔎 Running incidence graph check for project at: ${projectRoot}`);
        console.log(`   Using rules from: ${rulesFile}`);
        try {
            // 1. Read and parse the rules file
            const rulesContent = await fs.readFile(rulesFile, 'utf-8');
            const graph = JSON.parse(rulesContent);
            // 2. Read the project's package.json
            const packageJsonPath = path.join(projectRoot, 'package.json');
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(packageJsonContent);
            // 3. Collect all dependencies
            const installedPackages = new Map();
            const allDependencies = {
                ...(packageJson.dependencies || {}),
                ...(packageJson.devDependencies || {}),
                ...(packageJson.peerDependencies || {}),
            };
            for (const [name, version] of Object.entries(allDependencies)) {
                installedPackages.set(name, version);
            }
            console.log(`   Found ${installedPackages.size} total dependencies.`);
            // 4. Determine environment key
            // TODO: Implement dynamic environment key detection.
            // For now, using the one from the example.
            const envKey = 'env:node20-linux-x64-glibc-2.35';
            console.log(`   Using environment key: ${envKey}`);
            // 5. Run the checker
            const checker = new IncidenceGraphCheckerService();
            const result = checker.check(graph, installedPackages, envKey);
            // 6. Report results
            if (result.violations.length === 0) {
                console.log('\n✅ No compatibility violations found.');
            }
            else {
                console.error(`\n❌ Found ${result.violations.length} compatibility violation(s):`);
                console.log(JSON.stringify(result, null, 2));
                process.exitCode = 1; // Set exit code to indicate failure
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.error(`❌ Error: Could not find file at ${error.path}`);
            }
            else {
                console.error('❌ An unexpected error occurred during compatibility check:', error);
            }
            process.exit(1);
        }
    }
    /**
     * Resolve project dependencies using the new resolver service.
     */
    async resolveDependencies(options) {
        const projectRoot = options.projectRoot || process.cwd();
        console.log(`🚀 Starting dependency resolution for project at: ${projectRoot}`);
        // This is a placeholder for the actual store configuration.
        // In a real application, this would come from a config file.
        const storeClient = new GitHubStoreClient({
            owner: 'junkawasaki', // Replace with the actual store owner
            repo: 'dep-store', // Replace with the actual store repo
        });
        await storeClient.initialize();
        const resolver = new ResolverService(storeClient);
        try {
            const lockFile = await resolver.resolveProject(projectRoot);
            console.log('✅ Resolution successful!');
            console.log(`   - Resolved ${Object.keys(lockFile.dependencies).length} dependencies.`);
            // Further steps would involve fetching and linking packages.
        }
        catch (error) {
            console.error('❌ Resolution failed:', error);
            process.exit(1);
        }
    }
    /**
     * Check compatibility for a framework and packages
     */
    async checkCompatibility(framework, packages, options) {
        console.log(`🔍 Checking compatibility for ${framework}...`);
        // Parse framework (e.g., "next@15.0.0" -> {name: "next", version: "15.0.0"})
        const [frameworkName, frameworkVersion] = framework.includes('@')
            ? framework.split('@', 2)
            : [framework, undefined];
        if (!frameworkVersion) {
            console.error('❌ Framework version must be specified (e.g., next@15.0.0)');
            process.exit(1);
        }
        // Parse additional packages
        const additionalPackages = {};
        packages.forEach(pkg => {
            const [name, version] = pkg.includes('@') ? pkg.split('@', 2) : [pkg, undefined];
            if (version) {
                additionalPackages[name] = version;
            }
        });
        // Build query
        const query = {
            framework: frameworkName,
            version: frameworkVersion,
            limit: 20,
        };
        if (options.node)
            query.node = options.node;
        if (options.react)
            query.react = options.react;
        const issues = await this.db.queryIssues(query);
        // Filter issues that match our packages
        const relevantIssues = issues.filter(issue => {
            if (!issue.libs)
                return false;
            // Check if this issue involves any of our packages
            return Object.keys(additionalPackages).some(pkg => {
                const issueVersion = issue.libs[pkg];
                const requestedVersion = additionalPackages[pkg];
                return issueVersion && this.matchesVersion(issueVersion, requestedVersion);
            });
        });
        if (relevantIssues.length === 0) {
            console.log('✅ No known compatibility issues found.');
            console.log('   This combination may work, but hasn\'t been tested yet.');
            return;
        }
        // Display results
        const failed = relevantIssues.filter(i => i.status === 'fail');
        const warned = relevantIssues.filter(i => i.status === 'warn');
        const passed = relevantIssues.filter(i => i.status === 'pass');
        console.log(`\n📊 Compatibility Analysis:`);
        console.log(`   Found ${relevantIssues.length} relevant issues`);
        if (failed.length > 0) {
            console.log(`\n❌ ${failed.length} Failed combinations:`);
            failed.slice(0, 5).forEach(issue => {
                console.log(`   - ${issue.error ?? 'Unknown error'}`);
                if (issue.workaround) {
                    console.log(`     💡 ${issue.workaround}`);
                }
            });
        }
        if (warned.length > 0) {
            console.log(`\n⚠️  ${warned.length} Warning combinations:`);
            warned.slice(0, 3).forEach(issue => {
                console.log(`   - ${issue.error ?? 'Unknown warning'}`);
            });
        }
        if (passed.length > 0) {
            console.log(`\n✅ ${passed.length} Passed combinations`);
        }
        const successRate = (passed.length / relevantIssues.length) * 100;
        console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);
    }
    /**
     * Search compatibility database
     */
    async searchCompatibility(_query, options) {
        const searchQuery = {
            limit: parseInt(options.limit || '10'),
        };
        if (options.framework)
            searchQuery.framework = options.framework;
        if (options.status)
            searchQuery.status = options.status;
        const issues = await this.db.queryIssues(searchQuery);
        if (issues.length === 0) {
            console.log('No compatibility issues found.');
            return;
        }
        // Display results in a table
        const tableData = [
            ['Framework', 'Version', 'React', 'Status', 'Error/Workaround'],
            ...issues.map(issue => [
                issue.framework,
                issue.version,
                issue.react || '-',
                issue.status.toUpperCase(),
                (issue.error?.substring(0, 50) ?? '-') + (issue.error && issue.error.length > 50 ? '...' : '')
            ])
        ];
        console.log(table(tableData));
        console.log(`\nShowing ${issues.length} results`);
    }
    /**
     * Report a new compatibility issue
     */
    async reportIssue(options) {
        if (!options.framework) {
            console.error('❌ Framework is required (use -f or --framework)');
            process.exit(1);
        }
        const [framework, version] = options.framework.includes('@')
            ? options.framework.split('@', 2)
            : [options.framework, undefined];
        if (!version) {
            console.error('❌ Framework version must be specified (e.g., next@15.0.0)');
            process.exit(1);
        }
        if (!options.status) {
            console.error('❌ Status is required (use -s or --status)');
            process.exit(1);
        }
        // Parse additional libraries
        let libs = {};
        if (options.libs) {
            try {
                libs = JSON.parse(options.libs);
            }
            catch {
                console.error('❌ Invalid libs JSON format');
                process.exit(1);
            }
        }
        const issue = {
            id: '', // Will be generated
            framework,
            version,
            react: options.react,
            node: options.node,
            packageManager: options.packageManager,
            libs: Object.keys(libs).length > 0 ? libs : undefined,
            status: options.status,
            error: options.error,
            workaround: options.workaround,
            reportedAt: new Date().toISOString(),
            verified: options.verified || false,
            source: options.source || 'manual',
        };
        try {
            await this.db.saveIssue(issue);
            console.log('✅ Compatibility issue reported successfully!');
            console.log(`   Issue ID: ${issue.id}`);
        }
        catch (error) {
            console.error('❌ Failed to report issue:', error);
            process.exit(1);
        }
    }
    /**
     * Show database statistics
     */
    async showStats() {
        const stats = this.db.getStats();
        console.log('📊 DepCompat Database Statistics\n');
        console.log(`Total Issues:     ${stats.total}`);
        console.log(`Verified Issues:  ${stats.verified}`);
        console.log(`Failed:           ${stats.failed}`);
        console.log(`Warnings:         ${stats.warned}`);
        console.log(`Passed:           ${stats.passed}`);
        console.log();
        if (stats.frameworks.length > 0) {
            console.log('Frameworks:');
            stats.frameworks.forEach(framework => {
                console.log(`  - ${framework}`);
            });
            console.log();
        }
        console.log(`Last Updated:     ${new Date(stats.lastUpdated).toLocaleString()}`);
        console.log(`Database Hash:    ${stats.merkleRoot.substring(0, 16)}...`);
        const successRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
        console.log(`Success Rate:     ${successRate.toFixed(1)}%`);
    }
    /**
     * Export compatibility database
     */
    async exportDatabase(outputFile) {
        try {
            const data = await this.db.exportDatabase();
            // Ensure output directory exists
            const fs = await import('fs/promises');
            const path = await import('path');
            const dir = path.dirname(outputFile);
            try {
                await fs.access(dir);
            }
            catch {
                await fs.mkdir(dir, { recursive: true });
            }
            await fs.writeFile(outputFile, JSON.stringify(data, null, 2));
            console.log(`✅ Database exported to ${outputFile}`);
            console.log(`   ${data.issues.length} issues exported`);
            console.log(`   Schema version: ${data.schemaVersion}`);
            console.log(`   Last updated: ${new Date(data.lastUpdated).toLocaleString()}`);
        }
        catch (error) {
            console.error('❌ Failed to export database:', error);
            process.exit(1);
        }
    }
    /**
     * Simple version matching utility
     */
    matchesVersion(version, constraint) {
        if (constraint.includes('^')) {
            const baseVersion = constraint.replace('^', '');
            const baseParts = baseVersion.split('.');
            const versionParts = version.split('.');
            return versionParts[0] === baseParts[0] && versionParts[1] === baseParts[1];
        }
        if (constraint.includes('~')) {
            const baseVersion = constraint.replace('~', '');
            const baseParts = baseVersion.split('.');
            const versionParts = version.split('.');
            return versionParts[0] === baseParts[0] && versionParts[1] === baseParts[1];
        }
        return version === constraint || version.startsWith(constraint);
    }
}
