// Shigrami - GitHub Pages JavaScript Application

class ShigramiApp {
    constructor() {
        this.allIssues = [];
        this.filteredIssues = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.searchTerm = '';
        this.frameworkFilter = '';
        this.statusFilter = '';
        this.sortBy = 'reportedAt';

        this.initialize();
    }

    async initialize() {
        await this.loadData();
        this.setupEventListeners();
        this.renderStats();
        this.renderFilters();
        this.filterAndRenderIssues();
    }

    async loadData() {
        try {
            // Load compatibility data from the embedded JSON
            const dataScript = document.getElementById('compatibilityData');
            if (dataScript && dataScript.textContent) {
                const data = JSON.parse(dataScript.textContent);
                this.allIssues = data.issues || [];
            } else {
                // Fallback: try to load from a separate file
                const response = await fetch('./data/compatibility-data.json');
                const data = await response.json();
                this.allIssues = data.issues || [];
            }
        } catch (error) {
            console.error('Failed to load compatibility data:', error);
            // Use sample data for demonstration
            this.allIssues = this.getSampleData();
        }
    }

    getSampleData() {
        return [
            {
                id: 'next15-react19-001',
                framework: 'next',
                version: '15.0.0',
                react: '19.0.0',
                node: '20.11.0',
                packageManager: 'npm',
                libs: {
                    'next-auth': '5.0.0-beta.3'
                },
                status: 'fail',
                error: 'ERESOLVE could not resolve peer dependencies',
                workaround: 'Use --legacy-peer-deps or downgrade React to 18.2.0',
                reportedAt: '2024-01-15T10:00:00Z',
                verified: true,
                source: 'github-issue'
            },
            {
                id: 'next14-react18-001',
                framework: 'next',
                version: '14.2.5',
                react: '18.2.0',
                node: '18.17.0',
                packageManager: 'npm',
                libs: {
                    'recoil': '0.7.7'
                },
                status: 'pass',
                error: null,
                workaround: null,
                reportedAt: '2024-01-10T08:30:00Z',
                verified: true,
                source: 'ci-test'
            },
            {
                id: 'astro4-react18-001',
                framework: 'astro',
                version: '4.0.0',
                react: '18.2.0',
                node: '20.11.0',
                packageManager: 'pnpm',
                libs: {
                    'react-query': '5.x'
                },
                status: 'warn',
                error: 'Hydration warning in development mode',
                workaround: 'Warning is harmless in production',
                reportedAt: '2024-01-12T14:20:00Z',
                verified: false,
                source: 'manual'
            }
        ];
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterAndRenderIssues();
        });

        searchBtn.addEventListener('click', () => {
            this.filterAndRenderIssues();
        });

        // Filters
        document.getElementById('frameworkFilter').addEventListener('change', (e) => {
            this.frameworkFilter = e.target.value;
            this.filterAndRenderIssues();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.filterAndRenderIssues();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.filterAndRenderIssues();
        });

        // Pagination
        document.getElementById('prevBtn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderIssues();
            }
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            const maxPages = Math.ceil(this.filteredIssues.length / this.itemsPerPage);
            if (this.currentPage < maxPages) {
                this.currentPage++;
                this.renderIssues();
            }
        });

        // Modal
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('issueModal').style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('issueModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    renderStats() {
        const stats = {
            total: this.allIssues.length,
            failed: this.allIssues.filter(i => i.status === 'fail').length,
            warned: this.allIssues.filter(i => i.status === 'warn').length,
            passed: this.allIssues.filter(i => i.status === 'pass').length,
        };

        document.getElementById('totalIssues').textContent = stats.total;
        document.getElementById('failedCount').textContent = stats.failed;
        document.getElementById('warnCount').textContent = stats.warned;
        document.getElementById('passCount').textContent = stats.passed;
    }

    renderFilters() {
        const frameworkSelect = document.getElementById('frameworkFilter');
        const frameworks = [...new Set(this.allIssues.map(i => i.framework))].sort();

        frameworks.forEach(framework => {
            const option = document.createElement('option');
            option.value = framework;
            option.textContent = framework.charAt(0).toUpperCase() + framework.slice(1);
            frameworkSelect.appendChild(option);
        });
    }

    filterAndRenderIssues() {
        this.filteredIssues = this.allIssues.filter(issue => {
            // Search term
            if (this.searchTerm) {
                const searchText = `${issue.framework} ${issue.version} ${issue.react || ''} ${issue.error || ''} ${Object.keys(issue.libs || {}).join(' ')}`.toLowerCase();
                if (!searchText.includes(this.searchTerm)) {
                    return false;
                }
            }

            // Framework filter
            if (this.frameworkFilter && issue.framework !== this.frameworkFilter) {
                return false;
            }

            // Status filter
            if (this.statusFilter && issue.status !== this.statusFilter) {
                return false;
            }

            return true;
        });

        // Sort
        this.filteredIssues.sort((a, b) => {
            switch (this.sortBy) {
                case 'framework':
                    return a.framework.localeCompare(b.framework);
                case 'status':
                    return a.status.localeCompare(b.status);
                case 'reportedAt':
                default:
                    return new Date(b.reportedAt) - new Date(a.reportedAt);
            }
        });

        this.currentPage = 1;
        this.renderIssues();
    }

    renderIssues() {
        const issuesGrid = document.getElementById('issuesGrid');
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const issuesToShow = this.filteredIssues.slice(startIndex, endIndex);

        issuesGrid.innerHTML = '';

        if (issuesToShow.length === 0) {
            issuesGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No issues found</h3>
                    <p>Try adjusting your search criteria or filters.</p>
                </div>
            `;
            this.updatePagination();
            return;
        }

        issuesToShow.forEach(issue => {
            const issueCard = this.createIssueCard(issue);
            issuesGrid.appendChild(issueCard);
        });

        this.updatePagination();
    }

    createIssueCard(issue) {
        const card = document.createElement('div');
        card.className = 'issue-card';
        card.onclick = () => this.showIssueModal(issue);

        const libs = issue.libs ? Object.entries(issue.libs) : [];

        card.innerHTML = `
            <div class="issue-header">
                <div class="issue-title">${issue.framework}@${issue.version}</div>
                <div class="issue-meta">
                    <span><i class="fab fa-${this.getPackageManagerIcon(issue.packageManager)}"></i> ${issue.packageManager || 'npm'}</span>
                    <span><i class="fab fa-node-js"></i> ${issue.node || 'any'}</span>
                    ${issue.react ? `<span><i class="fab fa-react"></i> ${issue.react}</span>` : ''}
                </div>
            </div>
            <div class="issue-content">
                <div class="issue-description">
                    ${issue.error || 'No description available'}
                </div>
                <div class="issue-status status-${issue.status}">
                    ${this.getStatusIcon(issue.status)} ${issue.status.toUpperCase()}
                </div>
                ${libs.length > 0 ? `
                    <div class="issue-libs">
                        <h4>Libraries:</h4>
                        ${libs.map(([lib, version]) => `<span class="lib-tag">${lib}@${version}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    showIssueModal(issue) {
        const modal = document.getElementById('issueModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `${issue.framework}@${issue.version} - Issue Details`;

        const libs = issue.libs ? Object.entries(issue.libs) : [];

        modalBody.innerHTML = `
            <div class="modal-field">
                <h3>Framework</h3>
                <p>${issue.framework}@${issue.version}</p>
            </div>

            ${issue.react ? `
                <div class="modal-field">
                    <h3>React Version</h3>
                    <p>${issue.react}</p>
                </div>
            ` : ''}

            ${issue.node ? `
                <div class="modal-field">
                    <h3>Node.js Version</h3>
                    <p>${issue.node}</p>
                </div>
            ` : ''}

            ${issue.packageManager ? `
                <div class="modal-field">
                    <h3>Package Manager</h3>
                    <p>${issue.packageManager}</p>
                </div>
            ` : ''}

            <div class="modal-field">
                <h3>Status</h3>
                <p><span class="issue-status status-${issue.status}">${this.getStatusIcon(issue.status)} ${issue.status.toUpperCase()}</span></p>
            </div>

            ${libs.length > 0 ? `
                <div class="modal-field">
                    <h3>Additional Libraries</h3>
                    <p>${libs.map(([lib, version]) => `${lib}@${version}`).join(', ')}</p>
                </div>
            ` : ''}

            ${issue.error ? `
                <div class="modal-field">
                    <h3>Error Description</h3>
                    <p>${issue.error}</p>
                </div>
            ` : ''}

            ${issue.workaround ? `
                <div class="modal-field">
                    <h3>Workaround</h3>
                    <p>${issue.workaround}</p>
                </div>
            ` : ''}

            <div class="modal-field">
                <h3>Reported</h3>
                <p>${new Date(issue.reportedAt).toLocaleString()}</p>
            </div>

            <div class="modal-field">
                <h3>Source</h3>
                <p>${issue.source} ${issue.verified ? '(Verified)' : '(Unverified)'}</p>
            </div>

            ${issue.issueUrl ? `
                <div class="modal-field">
                    <h3>Reference</h3>
                    <p><a href="${issue.issueUrl}" target="_blank">${issue.issueUrl}</a></p>
                </div>
            ` : ''}
        `;

        modal.style.display = 'block';
    }

    updatePagination() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const pageInfo = document.getElementById('pageInfo');

        const maxPages = Math.ceil(this.filteredIssues.length / this.itemsPerPage);

        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= maxPages;

        pageInfo.textContent = `Page ${this.currentPage} of ${maxPages || 1}`;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'fail': return '❌';
            case 'warn': return '⚠️';
            case 'pass': return '✅';
            default: return '❓';
        }
    }

    getPackageManagerIcon(manager) {
        switch (manager) {
            case 'yarn': return 'yarn';
            case 'pnpm': return 'pnpm';
            case 'npm':
            default: return 'npm';
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ShigramiApp();
});
