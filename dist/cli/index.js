/**
 * CLI Interface for DepCompat
 * Merkle DAG Node: cli_tools
 *
 * Command-line interface for interacting with the compatibility database.
 * Provides commands for checking compatibility, reporting issues, and managing data.
 */
import { table } from 'table';
export class CLI {
    db;
    constructor(db) {
        this.db = db;
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
                console.log(`   - ${issue.error}`);
                if (issue.workaround) {
                    console.log(`     💡 ${issue.workaround}`);
                }
            });
        }
        if (warned.length > 0) {
            console.log(`\n⚠️  ${warned.length} Warning combinations:`);
            warned.slice(0, 3).forEach(issue => {
                console.log(`   - ${issue.error}`);
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
    async searchCompatibility(query, options) {
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
                issue.error?.substring(0, 50) + (issue.error && issue.error.length > 50 ? '...' : '') || '-'
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
            source: 'manual',
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
