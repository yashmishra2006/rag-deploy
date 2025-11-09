// js/pages/docs.js - Documentation Page Module

function DocsPage() {
    return `
        <div class="container">
            <h2 class="mb-2" style="color: var(--primary-color);">📚 Documentation</h2>

            <div class="card">
                <h3>🚀 Getting Started</h3>
                <p style="margin-bottom: 1rem;">Follow these simple steps to start analyzing your database:</p>
                <ol style="margin-left: 1.5rem; line-height: 2;">
                    <li><strong style="color: var(--primary-color);">Upload Your Database:</strong> Navigate to the Upload page and select your database file (CSV, JSON, or SQL dump). You can also drag and drop files directly.</li>
                    <li><strong style="color: var(--primary-color);">Review Schema:</strong> After upload, review the detected schema to ensure correct interpretation of tables and columns.</li>
                    <li><strong style="color: var(--primary-color);">Ask Questions:</strong> Use natural language on the Query page to ask questions about your data. Examples: "Show me top 10 customers" or "What's the average sales by month?"</li>
                    <li><strong style="color: var(--primary-color);">View Results:</strong> See your results in tables and interactive visualizations on the Results page.</li>
                    <li><strong style="color: var(--primary-color);">Export Data:</strong> Download your results in various formats (PDF, Excel, CSV, JSON) from the Export page.</li>
                </ol>
            </div>

            <div class="card mt-2">
                <h3>❓ Frequently Asked Questions</h3>
                
                <div class="faq-item" style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">What file formats are supported?</h4>
                    <p>We currently support CSV, JSON, and SQL dump files. Make sure your files are properly formatted:
                    <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                        <li><strong>CSV:</strong> Comma-separated values with headers in the first row</li>
                        <li><strong>JSON:</strong> Valid JSON format with array of objects or nested structure</li>
                        <li><strong>SQL:</strong> Standard SQL dump files with CREATE and INSERT statements</li>
                    </ul>
                    </p>
                </div>

                <div class="faq-item" style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">How do I write natural language queries?</h4>
                    <p>Simply type your question as you would ask a human. Our AI understands various query patterns:
                    <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                        <li>"Show me all sales from last month"</li>
                        <li>"What are the top 10 customers by revenue?"</li>
                        <li>"Calculate average order value by region"</li>
                        <li>"Find products with inventory below 100"</li>
                        <li>"Compare sales between Q1 and Q2 2024"</li>
                    </ul>
                    </p>
                </div>

                <div class="faq-item" style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">Is my data secure?</h4>
                    <p>Yes! Your data is processed securely:
                    <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                        <li>Files are processed in-memory and not stored permanently</li>
                        <li>All data transmission is encrypted using HTTPS</li>
                        <li>Query history is stored locally in your browser</li>
                        <li>You can clear all data anytime from the Settings page</li>
                    </ul>
                    </p>
                </div>

                <div class="faq-item" style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">What's the maximum file size?</h4>
                    <p>Currently, we support files up to 100MB. For larger datasets, consider:
                    <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                        <li>Splitting your data into smaller files</li>
                        <li>Using SQL queries to export specific subsets</li>
                        <li>Filtering data before export</li>
                    </ul>
                    </p>
                </div>

                <div class="faq-item" style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">Can I connect to live databases?</h4>
                    <p>Live database connections (MySQL, PostgreSQL, MongoDB) are coming soon! Currently, we support file uploads only. Stay tuned for updates.</p>
                </div>

                <div class="faq-item">
                    <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">How do I export my results?</h4>
                    <p>Navigate to the Export page after running a query. You can download your results in multiple formats:
                    <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                        <li><strong>PDF:</strong> Professional reports with tables and charts</li>
                        <li><strong>Excel:</strong> Spreadsheet format with formulas preserved</li>
                        <li><strong>CSV:</strong> Raw data for import into other tools</li>
                        <li><strong>JSON:</strong> API-friendly format for integration</li>
                        <li><strong>Images:</strong> Chart visualizations as PNG/JPEG</li>
                    </ul>
                    </p>
                </div>
            </div>

            <div class="card mt-2">
                <h3>💡 Tips & Best Practices</h3>
                <ul style="margin-left: 1.5rem;">
                    <li><strong>Data Quality:</strong> Ensure your data files are well-formatted and free of errors before uploading</li>
                    <li><strong>Specific Queries:</strong> Use specific queries with date ranges and filters for better results</li>
                    <li><strong>Review Interpretations:</strong> Check the AI's query interpretation to understand how your question was processed</li>
                    <li><strong>Use Filters:</strong> Apply date and category filters on the Results page to refine visualizations</li>
                    <li><strong>Export Regularly:</strong> Download important results to keep track of your analysis</li>
                    <li><strong>Query History:</strong> Use the query history feature to quickly rerun common queries</li>
                    <li><strong>Chart Types:</strong> Experiment with different chart types to find the best visualization for your data</li>
                    <li><strong>Backup Settings:</strong> Note your preferences before clearing browser data</li>
                </ul>
            </div>

            <div class="card mt-2">
                <h3>🎓 Video Tutorials</h3>
                <p style="margin-bottom: 1rem;">Coming soon! Check back for video guides on:</p>
                <ul style="margin-left: 1.5rem;">
                    <li>Uploading and managing database files</li>
                    <li>Writing effective natural language queries</li>
                    <li>Creating stunning visualizations</li>
                    <li>Exporting and sharing results</li>
                    <li>Advanced tips and tricks</li>
                </ul>
            </div>

            <div class="card mt-2">
                <h3>📞 Support & Contact</h3>
                <p style="margin-bottom: 1rem;">Need help? We're here for you!</p>
                <div class="flex gap-1" style="flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="window.location.href='mailto:support@dbrag.com'">
                        📧 Email Support
                    </button>
                    <button class="btn btn-secondary" onclick="window.open('https://github.com/dbrag', '_blank')">
                        💻 GitHub
                    </button>
                    <button class="btn btn-secondary" onclick="alert('Discord community coming soon!')">
                        💬 Discord
                    </button>
                </div>
            </div>

            <div class="insights-box mt-2">
                <h4>🔄 Regular Updates</h4>
                <p>We're constantly improving DB RAG Analytics. Recent updates include:
                <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                    <li>Enhanced AI query interpretation</li>
                    <li>New chart types and visualization options</li>
                    <li>Improved export functionality</li>
                    <li>Better error handling and validation</li>
                    <li>Performance optimizations</li>
                </ul>
                </p>
            </div>
        </div>
    `;
}   