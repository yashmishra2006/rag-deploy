// js/pages/results.js - Results & Visualization Page Module

function ResultsPage() {
    return `
        ${AppState.queryResults.length === 0 ? `
            <div class="alert alert-info">
                ℹ️ No query results available. Execute a query first to see visualizations.
            </div>
        ` : ''}

        <div class="card visualization-card">
            <div class="card-header">
                <h3 class="card-title">Data Visualization</h3>
                <p class="card-subtitle">Interactive charts and graphs</p>
            </div>
            
            <div class="chart-controls">
                <label class="form-label">Chart Type:</label>
                <div class="chart-type-selector">
                    <button class="chart-type-btn active" data-type="bar" onclick="selectChartType('bar', this)">
                        <span class="chart-type-icon">📊</span>
                        <span>Bar</span>
                    </button>
                    <button class="chart-type-btn" data-type="line" onclick="selectChartType('line', this)">
                        <span class="chart-type-icon">📈</span>
                        <span>Line</span>
                    </button>
                    <button class="chart-type-btn" data-type="pie" onclick="selectChartType('pie', this)">
                        <span class="chart-type-icon">🥧</span>
                        <span>Pie</span>
                    </button>
                    <button class="chart-type-btn" data-type="doughnut" onclick="selectChartType('doughnut', this)">
                        <span class="chart-type-icon">🍩</span>
                        <span>Doughnut</span>
                    </button>
                </div>
            </div>
            
            <div class="chart-container">
                <canvas id="mainChart" width="400" height="400"></canvas>
            </div>
        </div>

        ${AppState.queryResults.length > 0 ? `
            <div class="card insights-card">
                <div class="card-header">
                    <h3 class="card-title">Data Insights</h3>
                    <p class="card-subtitle">Key metrics at a glance</p>
                </div>
                <div class="stats-grid">
                    <div class="stat-card-mini">
                        <div class="stat-label">Total Records</div>
                        <div class="stat-value-accent" id="totalRecords">-</div>
                    </div>
                    <div class="stat-card-mini">
                        <div class="stat-label">Average Value</div>
                        <div class="stat-value-accent" id="avgValue">-</div>
                    </div>
                    <div class="stat-card-mini">
                        <div class="stat-label">Maximum</div>
                        <div class="stat-value-accent" id="maxValue">-</div>
                    </div>
                    <div class="stat-card-mini">
                        <div class="stat-label">Minimum</div>
                        <div class="stat-value-accent" id="minValue">-</div>
                    </div>
                </div>
            </div>

            <div class="card data-table-card">
                <div class="card-header">
                    <h3 class="card-title">Raw Data</h3>
                    <p class="card-subtitle">Complete dataset view</p>
                </div>
                <div class="table-container">
                    <table>
                        <thead id="visualResultsHead"></thead>
                        <tbody id="visualResultsBody"></tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="btn-group">
                    <button class="btn btn-accent" onclick="navigateTo('export')">Export Results →</button>
                    <button class="btn btn-secondary" onclick="downloadChart()">Download Chart</button>
                    <button class="btn btn-secondary" onclick="navigateTo('query')">New Query</button>
                </div>
            </div>
        ` : ''}
    `;
}

function initializeResultsPage() {
    console.log('Initializing Results Page');
    console.log('Query Results:', AppState.queryResults);
    console.log('Chart Data:', AppState.chartData);
    
    if (AppState.queryResults.length === 0 && !AppState.chartData) {
        console.warn('No query results to display');
        return;
    }
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded!');
        showAlert('Chart library not loaded. Please refresh the page.', 'error');
        return;
    }
    
    // Wait for DOM to be ready
    setTimeout(() => {
        if (AppState.queryResults.length > 0) {
            displayResultsTable();
        }
        
        // Use backend-generated chart data if available, otherwise create from results
        if (AppState.chartData) {
            createChartFromBackend(AppState.chartData);
        } else if (AppState.queryResults.length > 0) {
            createChart('bar');
        }
        
        if (AppState.queryResults.length > 0) {
            calculateInsights();
        }
    }, 100);
}

function displayResultsTable() {
    const results = AppState.queryResults;
    const thead = document.getElementById('visualResultsHead');
    const tbody = document.getElementById('visualResultsBody');
    
    if (!thead || !tbody) return;
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    const headerRow = document.createElement('tr');
    Object.keys(results[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key.toUpperCase();
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    results.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function createChart(type) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) {
        console.error('Chart canvas not found');
        return;
    }
    
    if (AppState.currentChart) {
        AppState.currentChart.destroy();
    }
    
    const results = AppState.queryResults;
    if (!results || results.length === 0) {
        console.warn('No query results available for chart');
        return;
    }
    
    // Extract labels and data intelligently
    const { labels, data } = extractChartData(results);
    
    console.log('Chart data:', { labels, data, type });
    
    const backgroundColor = type === 'pie' || type === 'doughnut' 
        ? generateColors(data.length)
        : 'rgba(217, 119, 6, 0.8)'; // Orange accent color
    
    const borderColor = type === 'pie' || type === 'doughnut'
        ? generateColors(data.length, true)
        : 'rgba(217, 119, 6, 1)';
    
    AppState.currentChart = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: 'Value',
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#e0e0e0',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: type !== 'pie' && type !== 'doughnut' ? {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        color: '#a0a0a0',
                        font: {
                            size: 11
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { 
                        color: '#a0a0a0',
                        font: {
                            size: 11
                        },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            } : {}
        }
    });
    
    console.log('Chart created successfully');
}

function extractChartData(results) {
    // Get all keys from first result
    const keys = Object.keys(results[0]);
    
    // Find label column (usually first string column or _id)
    let labelKey = keys.find(k => 
        k.toLowerCase().includes('name') || 
        k.toLowerCase().includes('product') || 
        k.toLowerCase().includes('category') ||
        k.toLowerCase().includes('customer') ||
        k === '_id'
    ) || keys[0];
    
    // Find data column (usually numeric column)
    let dataKey = keys.find(k => 
        k.toLowerCase().includes('amount') || 
        k.toLowerCase().includes('value') || 
        k.toLowerCase().includes('count') ||
        k.toLowerCase().includes('total') ||
        k.toLowerCase().includes('price') ||
        k.toLowerCase().includes('quantity')
    );
    
    // If no numeric column found, use second column or count
    if (!dataKey) {
        dataKey = keys.length > 1 ? keys[1] : 'count';
    }
    
    const labels = [];
    const data = [];
    
    results.forEach((result, index) => {
        // Extract label
        let label = result[labelKey];
        if (typeof label === 'object') {
            label = JSON.stringify(label);
        }
        labels.push(label || `Item ${index + 1}`);
        
        // Extract data value
        let value = result[dataKey];
        
        // Convert to number if possible
        if (typeof value === 'string') {
            value = parseFloat(value) || 0;
        } else if (typeof value === 'object') {
            value = 1; // Count as 1 if object
        } else if (typeof value !== 'number') {
            value = 1; // Default to 1 for counting
        }
        
        data.push(value);
    });
    
    console.log('Extracted chart data:', { labelKey, dataKey, labels, data });
    
    return { labels, data };
}

function generateColors(count, border = false) {
    const colors = [];
    const alpha = border ? 1 : 0.8;
    for (let i = 0; i < count; i++) {
        const hue = (i * 360 / count) % 360;
        colors.push(`hsla(${hue}, 60%, 50%, ${alpha})`);
    }
    return colors;
}

// Test function to load sample data for chart testing
function loadSampleChartData() {
    AppState.queryResults = [
        { product: 'Laptop', amount: 1200, date: '2024-01-15' },
        { product: 'Mouse', amount: 25, date: '2024-01-16' },
        { product: 'Keyboard', amount: 75, date: '2024-01-17' },
        { product: 'Monitor', amount: 350, date: '2024-01-18' },
        { product: 'Headphones', amount: 150, date: '2024-01-19' }
    ];
    
    navigateTo('results');
}

function selectChartType(type, btn) {
    document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    createChart(type);
}

function updateChartType() {
    const type = document.getElementById('chartType')?.value || 'bar';
    createChart(type);
}

function calculateInsights() {
    const results = AppState.queryResults;
    
    if (!results || results.length === 0) return;
    
    // Find numeric columns
    const keys = Object.keys(results[0]);
    const numericKey = keys.find(k => 
        typeof results[0][k] === 'number' ||
        k.toLowerCase().includes('amount') || 
        k.toLowerCase().includes('value') || 
        k.toLowerCase().includes('count') ||
        k.toLowerCase().includes('total') ||
        k.toLowerCase().includes('price')
    );
    
    // Extract numeric values
    const amounts = results.map(r => {
        const val = numericKey ? r[numericKey] : Object.values(r).find(v => typeof v === 'number');
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val) || 0;
        return 0;
    }).filter(v => !isNaN(v) && v !== null);
    
    if (amounts.length === 0) {
        // No numeric data found, show counts
        document.getElementById('maxValue').textContent = '-';
        document.getElementById('minValue').textContent = '-';
        document.getElementById('avgValue').textContent = '-';
        document.getElementById('totalRecords').textContent = results.length;
        return;
    }
    
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);
    const avg = (amounts.reduce((a, b) => a + b, 0) / amounts.length).toFixed(2);
    
    // Format with currency if it looks like money
    const isCurrency = numericKey && (
        numericKey.toLowerCase().includes('amount') ||
        numericKey.toLowerCase().includes('price') ||
        numericKey.toLowerCase().includes('total')
    );
    
    const formatter = isCurrency ? (v => `$${v.toLocaleString()}`) : (v => v.toLocaleString());
    
    document.getElementById('maxValue').textContent = formatter(max);
    document.getElementById('minValue').textContent = formatter(min);
    document.getElementById('avgValue').textContent = formatter(parseFloat(avg));
    document.getElementById('totalRecords').textContent = results.length;
}

function createChartFromBackend(chartConfig) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) {
        console.error('Chart canvas not found');
        return;
    }
    
    if (AppState.currentChart) {
        AppState.currentChart.destroy();
    }
    
    console.log('Creating chart from backend config:', chartConfig);
    
    // Prepare datasets with colors
    const datasets = chartConfig.datasets.map((dataset, index) => {
        const isPieChart = chartConfig.chartType === 'pie' || chartConfig.chartType === 'doughnut';
        
        return {
            label: dataset.label,
            data: dataset.data,
            backgroundColor: isPieChart 
                ? generateColors(dataset.data.length)
                : 'rgba(217, 119, 6, 0.8)',
            borderColor: isPieChart
                ? generateColors(dataset.data.length, true)
                : 'rgba(217, 119, 6, 1)',
            borderWidth: 2
        };
    });
    
    AppState.currentChart = new Chart(ctx, {
        type: chartConfig.chartType,
        data: {
            labels: chartConfig.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#e0e0e0',
                        font: { size: 12 }
                    }
                },
                title: {
                    display: true,
                    text: chartConfig.title || 'Query Results',
                    color: '#f59e0b',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: chartConfig.chartType !== 'pie' && chartConfig.chartType !== 'doughnut' ? {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0a0', font: { size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#a0a0a0', font: { size: 11 }, maxRotation: 45, minRotation: 0 },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            } : {}
        }
    });
    
    console.log('✓ Chart created from backend data');
    showAlert('Chart generated from query results', 'success');
}

function downloadChart() {
    if (!AppState.currentChart) {
        showAlert('No chart available to download', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.download = 'chart-' + Date.now() + '.png';
    link.href = AppState.currentChart.toBase64Image();
    link.click();
    
    showAlert('Chart downloaded successfully', 'success');
}