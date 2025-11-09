// js/pages/about.js - About Page Module

function AboutPage() {
    return `
        <div class="container">
            <h2 class="mb-2" style="color: var(--primary-color);">ℹ️ About DB RAG Analytics</h2>

            <div class="hero">
                <h1>🎯 Our Mission</h1>
                <p>To democratize data analytics by making database querying accessible to everyone through natural language processing and AI-powered insights.</p>
            </div>

            <div class="card mt-2">
                <h3>🌟 What We Do</h3>
                <p style="margin-bottom: 1rem;">
                    DB RAG Analytics is an AI-driven platform that bridges the gap between complex databases and everyday users. 
                    We believe that data analysis shouldn't require deep technical knowledge or SQL expertise. 
                    Our platform empowers anyone to extract meaningful insights from their data using simple, natural language queries.
                </p>
                <p>
                    Whether you're a business analyst, researcher, student, or entrepreneur, DB RAG Analytics makes it easy to:
                </p>
                <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                    <li>Query databases using plain English</li>
                    <li>Visualize data with interactive charts</li>
                    <li>Discover trends and anomalies automatically</li>
                    <li>Export results in multiple formats</li>
                    <li>Make data-driven decisions faster</li>
                </ul>
            </div>

            <div class="card mt-2">
                <h3>🔧 Technology Stack</h3>
                <div class="card-grid" style="margin-top: 1rem;">
                    <div>
                        <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">Frontend</h4>
                        <ul style="margin-left: 1.5rem;">
                            <li>HTML5 & CSS3</li>
                            <li>Vanilla JavaScript (ES6+)</li>
                            <li>Chart.js for visualizations</li>
                            <li>Responsive design</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">AI & Processing</h4>
                        <ul style="margin-left: 1.5rem;">
                            <li>Natural Language Processing</li>
                            <li>Query interpretation models</li>
                            <li>Anomaly detection algorithms</li>
                            <li>Trend analysis</li>
                        </ul>
                    </div>
                    <div>
                        <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">Data Support</h4>
                        <ul style="margin-left: 1.5rem;">
                            <li>CSV, JSON, SQL formats</li>
                            <li>Multiple database types</li>
                            <li>Schema auto-detection</li>
                            <li>Data validation</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="card mt-2">
                <h3>📈 Key Features</h3>
                <div class="card-grid" style="margin-top: 1rem;">
                    <div class="insights-box">
                        <h4>🤖 AI-Powered Queries</h4>
                        <p>Advanced NLP models understand your questions and convert them to optimized database queries automatically.</p>
                    </div>
                    <div class="insights-box">
                        <h4>📊 Smart Visualizations</h4>
                        <p>Automatic chart generation with intelligent type selection based on your data characteristics.</p>
                    </div>
                    <div class="insights-box">
                        <h4>🔍 Insight Generation</h4>
                        <p>AI analyzes your data to detect anomalies, trends, and patterns you might have missed.</p>
                    </div>
                    <div class="insights-box">
                        <h4>⚡ Real-Time Processing</h4>
                        <p>Fast query execution and instant visualization updates for seamless data exploration.</p>
                    </div>
                    <div class="insights-box">
                        <h4>📥 Flexible Export</h4>
                        <p>Multiple export formats including PDF, Excel, CSV, and JSON for any use case.</p>
                    </div>
                    <div class="insights-box">
                        <h4>🔒 Privacy First</h4>
                        <p>Your data stays secure with local processing and encrypted transmission.</p>
                    </div>
                </div>
            </div>

            <div class="card mt-2">
                <h3>🚀 Roadmap</h3>
                <p style="margin-bottom: 1rem;">We're constantly evolving. Here's what's coming:</p>
                <div style="margin-left: 1rem;">
                    <div style="margin-bottom: 1rem;">
                        <h4 style="color: var(--success-color); margin-bottom: 0.5rem;">✓ Phase 1 - Complete</h4>
                        <ul style="margin-left: 1.5rem;">
                            <li>File upload support (CSV, JSON, SQL)</li>
                            <li>Natural language query interface</li>
                            <li>Basic visualizations</li>
                            <li>Export functionality</li>
                        </ul>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <h4 style="color: var(--primary-color); margin-bottom: 0.5rem;">⏳ Phase 2 - In Progress</h4>
                        <ul style="margin-left: 1.5rem;">
                            <li>Live database connections (MySQL, PostgreSQL, MongoDB)</li>
                            <li>Advanced chart types and customization</li>
                            <li>Collaborative features</li>
                            <li>API access</li>
                        </ul>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">🔮 Phase 3 - Planned</h4>
                        <ul style="margin-left: 1.5rem;">
                            <li>Machine learning model integration</li>
                            <li>Predictive analytics</li>
                            <li>Multi-user workspaces</li>
                            <li>Mobile applications</li>
                            <li>Real-time data streaming</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="card mt-2">
                <h3>🏆 Why Choose Us?</h3>
                <div class="card-grid" style="margin-top: 1rem; text-align: center;">
                    <div>
                        <div style="font-size: 3rem; color: var(--primary-color); margin-bottom: 0.5rem;">95%</div>
                        <p>Query Accuracy</p>
                    </div>
                    <div>
                        <div style="font-size: 3rem; color: var(--primary-color); margin-bottom: 0.5rem;">&lt;2s</div>
                        <p>Average Query Time</p>
                    </div>
                    <div>
                        <div style="font-size: 3rem; color: var(--primary-color); margin-bottom: 0.5rem;">10K+</div>
                        <p>Active Users</p>
                    </div>
                    <div>
                        <div style="font-size: 3rem; color: var(--primary-color); margin-bottom: 0.5rem;">50M+</div>
                        <p>Queries Processed</p>
                    </div>
                </div>
            </div>

            <div class="card mt-2">
                <h3>👥 Team</h3>
                <p style="margin-bottom: 1rem;">
                    DB RAG Analytics is built by a passionate team of data scientists, engineers, and designers 
                    dedicated to making data analysis accessible to everyone.
                </p>
                <p style="color: var(--text-secondary);">
                    Want to join us? We're always looking for talented individuals who share our vision. 
                    <a href="mailto:careers@dbrag.com" style="color: var(--primary-color);">Get in touch!</a>
                </p>
            </div>

            <div class="card mt-2">
                <h3>📜 Open Source</h3>
                <p style="margin-bottom: 1rem;">
                    We believe in the power of open source. Parts of our platform are available on GitHub, 
                    and we welcome contributions from the community.
                </p>
                <button class="btn btn-primary" onclick="window.open('https://github.com/dbrag', '_blank')">
                    View on GitHub
                </button>
            </div>

            <div class="card mt-2">
                <h3>📄 Legal & Licensing</h3>
                <p style="margin-bottom: 1rem;">
                    DB RAG Analytics is committed to transparency and user rights.
                </p>
                <div class="flex gap-1" style="flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="alert('Privacy Policy will open')">
                        Privacy Policy
                    </button>
                    <button class="btn btn-secondary" onclick="alert('Terms of Service will open')">
                        Terms of Service
                    </button>
                    <button class="btn btn-secondary" onclick="alert('License information will open')">
                        License (MIT)
                    </button>
                </div>
            </div>

            <div class="hero mt-2">
                <h2>💚 Thank You!</h2>
                <p>Thank you for choosing DB RAG Analytics. We're excited to be part of your data journey!</p>
                <div class="flex gap-1" style="justify-content: center; margin-top: 2rem; flex-wrap: wrap;">
                    <button class="btn btn-outline" onclick="navigateTo('upload')">Get Started</button>
                    <button class="btn btn-outline" onclick="navigateTo('docs')">Read Documentation</button>
                    <button class="btn btn-outline" onclick="window.location.href='mailto:hello@dbrag.com'">Contact Us</button>
                </div>
            </div>
        </div>
    `;
}