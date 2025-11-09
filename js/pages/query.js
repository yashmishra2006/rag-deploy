// js/pages/query.js - Query Page Module

function QueryPage() {
    return `
        ${!AppState.uploadedFile && !AppState.apiConnected ? `
            <div class="alert alert-info">
                [INFO] No database connected. Please ensure the backend is running or upload a database file.
            </div>
        ` : ''}

        <div class="card query-card">
            <div class="card-header">
                <h3 class="card-title">Natural Language Query</h3>
                <p class="card-subtitle">Ask questions about your data in plain English - powered by AI</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Select Database</label>
                <select id="queryDatabaseSelect" class="form-input" onchange="updateQueryDatabase()">
                    <option value="">Select database to query...</option>
                </select>
                <small style="color: var(--text-secondary); display: block; margin-top: 0.25rem;">
                    Choose which database cluster to search for answers
                </small>
            </div>
            
            <div id="queryDatabaseInfo" class="hidden" style="margin-top: -0.5rem; margin-bottom: 1rem; padding: 0.75rem; background: rgba(217, 119, 6, 0.1); border-left: 3px solid var(--accent-color); border-radius: 4px;">
                <div style="font-size: 0.875rem; color: var(--text-primary);">
                    <strong id="queryDbInfoTitle">Database Info</strong>
                </div>
                <div id="queryDbInfoContent" style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    Loading...
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">What would you like to know?</label>
                <textarea id="queryInput" class="form-input query-textarea" placeholder="Example: Show me the top 5 products by sales in the last month&#10;Example: What is the total revenue by customer?&#10;Example: List all orders with status 'pending'"></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Number of Results</label>
                <input type="number" id="queryTopK" class="form-input" value="20" min="5" max="100" step="5" style="max-width: 200px;">
                <small style="color: var(--text-secondary); display: block; margin-top: 0.25rem;">
                    How many similar results to retrieve (5-100)
                </small>
            </div>

            <div class="query-suggestions">
                <span class="suggestion-label">Quick suggestions:</span>
                <button class="suggestion-chip" onclick="fillQuery('Show me the top 10 sales')">Top 10 sales</button>
                <button class="suggestion-chip" onclick="fillQuery('What is the average order value?')">Average order value</button>
                <button class="suggestion-chip" onclick="fillQuery('List all customers')">List customers</button>
            </div>
            
            <div class="btn-group">
                <button class="btn btn-accent" onclick="executeQuery()">
                    <span>Execute Query</span> →
                </button>
                <button class="btn btn-secondary" onclick="clearQuery()">Clear</button>
            </div>
        </div>

        <div id="queryInterpretation" class="hidden">
            <div class="card interpretation-card">
                <div class="card-header">
                    <h3 class="card-title">Query Interpretation</h3>
                    <p class="card-subtitle">AI-generated SQL from your natural language query</p>
                </div>
                <p id="interpretationText" class="interpretation-text"></p>
                <div class="sql-preview">
                    <div class="sql-label">Generated SQL:</div>
                    <code id="executedQuery" class="sql-code"></code>
                </div>
            </div>
        </div>

        <div id="queryResults" class="hidden">
            <div class="card results-card">
                <div class="card-header">
                    <h3 class="card-title">Query Results</h3>
                    <p class="card-subtitle">Retrieved <span id="resultCount">0</span> records</p>
                </div>
                <div class="table-container">
                    <table>
                        <thead id="resultsHead"></thead>
                        <tbody id="resultsBody"></tbody>
                    </table>
                </div>
                <div class="btn-group mt-2">
                    <button class="btn btn-accent" onclick="navigateTo('results')">View Visualization →</button>
                    <button class="btn btn-secondary" onclick="navigateTo('export')">Export Results</button>
                </div>
            </div>
        </div>

        ${AppState.queryHistory.length > 0 ? `
            <div class="card history-card">
                <div class="card-header">
                    <h3 class="card-title">Recent Queries</h3>
                    <p class="card-subtitle">Your query history</p>
                </div>
                <div class="history-list" id="historyList"></div>
            </div>
        ` : ''}
    `;
}

function initializeQueryPage() {
    displayQueryHistory();
    loadDatabasesForQuery();
}

async function loadDatabasesForQuery() {
    try {
        const select = document.getElementById('queryDatabaseSelect');
        if (!select) return;
        
        // Load databases
        const databases = await API.getDatabases();
        AppState.databases = databases.databases || [];
        
        // Clear and populate dropdown
        select.innerHTML = '<option value="">Select database to query...</option>';
        
        AppState.databases.forEach(db => {
            const option = document.createElement('option');
            option.value = db.key;
            option.textContent = `${db.name} (${db.key})`;
            if (db.key === AppState.currentDatabase) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Set default selected database
        if (!AppState.selectedDatabase && AppState.currentDatabase) {
            AppState.selectedDatabase = AppState.currentDatabase;
            select.value = AppState.currentDatabase;
        }
        
    } catch (error) {
        console.error('Error loading databases for query:', error);
    }
}

async function updateQueryDatabase() {
    const select = document.getElementById('queryDatabaseSelect');
    AppState.selectedDatabase = select.value;
    console.log('Selected database for query:', AppState.selectedDatabase);
    
    const infoDiv = document.getElementById('queryDatabaseInfo');
    const infoContent = document.getElementById('queryDbInfoContent');
    const infoTitle = document.getElementById('queryDbInfoTitle');
    
    if (AppState.selectedDatabase) {
        const dbName = select.options[select.selectedIndex].text;
        showAlert(`Will search in database: ${dbName}`, 'info');
        
        // Show info and load collection stats
        infoDiv.classList.remove('hidden');
        infoTitle.textContent = `${dbName}`;
        infoContent.textContent = 'Loading vectorization status...';
        
        try {
            // Get collections for this database
            const collections = await API.getCollections(AppState.selectedDatabase);
            const vectorized = collections.collections.filter(c => c.vectorized);
            const totalVectors = vectorized.reduce((sum, c) => sum + (c.vector_count || 0), 0);
            
            if (vectorized.length > 0) {
                const collNames = vectorized.map(c => c.name).join(', ');
                infoContent.innerHTML = `
                    [OK] <strong>${vectorized.length}</strong> vectorized collection(s): ${collNames}<br>
                    [DATA] Total vectors: <strong>${totalVectors.toLocaleString()}</strong>
                `;
            } else {
                infoContent.innerHTML = `
                    [WARNING] No vectorized collections found in this database.<br>
                    <small>Please vectorize collections first in the Upload page.</small>
                `;
            }
        } catch (error) {
            console.error('Error loading collection info:', error);
            infoContent.textContent = '[ERROR] Could not load collection information';
        }
    } else {
        infoDiv.classList.add('hidden');
    }
}

async function executeQuery() {
    const queryInput = document.getElementById('queryInput').value.trim();
    
    if (!queryInput) {
        showAlert('Please enter a query', 'error');
        return;
    }
    
    // Check if API is connected or if we have uploaded data
    if (!AppState.apiConnected && !AppState.uploadedFile) {
        showAlert('Please upload a database file first or ensure backend is running', 'error');
        return;
    }
    
    document.getElementById('queryInterpretation').classList.add('hidden');
    document.getElementById('queryResults').classList.add('hidden');
    
    // Show loading state
    showAlert('Processing your query...', 'info');
    
    if (AppState.apiConnected) {
        await processQueryWithAPI(queryInput);
    } else {
        // Fallback to sample data
        setTimeout(() => processQuery(queryInput), 800);
    }
}

async function processQueryWithAPI(query) {
    try {
        // Check if database is selected
        const dbKey = AppState.selectedDatabase;
        if (!dbKey) {
            showAlert('Please select a database to query', 'error');
            return;
        }
        
        // Get top_k value from input
        const topK = parseInt(document.getElementById('queryTopK')?.value || 20);
        
        console.log('Querying database:', dbKey, 'with top_k:', topK);
        const result = await API.vectorRagQuery(query, dbKey, null, topK);
        
        console.log('API Response:', result);
        
        // Display interpretation with keywords if available
        let interpretationText = '';
        if (result.search_keywords) {
            interpretationText = `[KEYWORDS] ${result.search_keywords}\n\n`;
        }
        interpretationText += result.answer || 'Query processed successfully';
        
        document.getElementById('interpretationText').textContent = interpretationText;
        
        // Display sources info as "query details"
        const queryDetails = {
            method: result.method || 'hybrid_keyword_semantic',
            search_keywords: result.search_keywords || 'N/A',
            embedding_model: result.embedding_model || 'all-MiniLM-L6-v2',
            embedding_dimensions: result.embedding_dimensions || 384,
            databases_searched: result.databases_searched || [AppState.selectedDatabase],
            collections_searched: result.collections_searched || [],
            total_sources: result.total_sources || 0
        };
        
        document.getElementById('executedQuery').textContent = JSON.stringify(queryDetails, null, 2);
        document.getElementById('queryInterpretation').classList.remove('hidden');
        
        // Convert sources to results format for table display
        const resultsData = result.sources ? result.sources.map(source => ({
            database: source.db_name || source.db_key,
            collection: source.collection,
            similarity: (source.similarity * 100).toFixed(1) + '%',
            text_preview: source.text_preview
        })) : [];
        
        // Store results
        AppState.queryResults = resultsData;
        
        // Store chart data if available
        AppState.chartData = result.chart_data || null;
        if (AppState.chartData) {
            console.log('[CHART] Chart data received from backend');
        }
        
        // Display results
        displayQueryResults(resultsData);
        addToQueryHistory(query, resultsData.length);
        
        // Show answer as insight
        if (result.answer) {
            showAlert(`Answer: ${result.answer.substring(0, 150)}...`, 'success');
        }
        
    } catch (error) {
        console.error('Query error:', error);
        showAlert(`Error executing query: ${error.message}`, 'error');
        
        // Fallback to sample data
        processQuery(query);
    }
}

function processQuery(query) {
    const interpretation = `Query interpreted: Retrieving top results from sales table ordered by amount.`;
    document.getElementById('interpretationText').textContent = interpretation;
    
    const sqlQuery = `SELECT * FROM sales ORDER BY amount DESC LIMIT 5;`;
    document.getElementById('executedQuery').textContent = sqlQuery;
    document.getElementById('queryInterpretation').classList.remove('hidden');
    
    const sampleData = generateSampleData();
    AppState.queryResults = sampleData.sampleResults;
    
    displayQueryResults(sampleData.sampleResults);
    addToQueryHistory(query, sampleData.sampleResults.length);
}

function fillQuery(text) {
    document.getElementById('queryInput').value = text;
}

function displayQueryResults(results) {
    if (!results || results.length === 0) {
        document.getElementById('queryResults').innerHTML = '<p>No results found.</p>';
        return;
    }
    
    document.getElementById('resultCount').textContent = results.length;
    
    const thead = document.getElementById('resultsHead');
    const tbody = document.getElementById('resultsBody');
    
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
    
    document.getElementById('queryResults').classList.remove('hidden');
}

function addToQueryHistory(query, resultCount) {
    const historyItem = {
        query: query,
        timestamp: new Date().toLocaleString(),
        resultCount: resultCount
    };
    
    AppState.queryHistory.unshift(historyItem);
    
    if (AppState.queryHistory.length > 10) {
        AppState.queryHistory.pop();
    }
    
    displayQueryHistory();
}

function displayQueryHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    historyList.innerHTML = AppState.queryHistory.slice(0, 5).map((item, index) => `
        <div class="history-item">
            <div class="history-content">
                <div class="history-query">${item.query}</div>
                <div class="history-meta">${item.timestamp} • ${item.resultCount} results</div>
            </div>
            <button class="btn" onclick="rerunQuery(${index})">Rerun</button>
        </div>
    `).join('');
}

function rerunQuery(index) {
    const query = AppState.queryHistory[index].query;
    document.getElementById('queryInput').value = query;
    executeQuery();
}

function clearQuery() {
    document.getElementById('queryInput').value = '';
    document.getElementById('queryInterpretation').classList.add('hidden');
    document.getElementById('queryResults').classList.add('hidden');
}