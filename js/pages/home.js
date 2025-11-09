// js/pages/dashboard.js - Dashboard Module

function DashboardPage() {
    const stats = getStats();
    
    return `
        <!-- Database Selector -->
        <div class="card mb-2">
            <div class="card-header">
                <h3 class="card-title">Current Database</h3>
            </div>
            <div class="form-group">
                <label for="dashboardDbSelect">Select Database:</label>
                <select id="dashboardDbSelect" class="form-control" onchange="switchDashboardDatabase(this.value)">
                    ${AppState.databases.map(db => `
                        <option value="${db.key}" ${db.key === AppState.currentDatabase ? 'selected' : ''}>
                            ${db.name} (${db.key})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="db-info-grid">
                <div class="db-info-item">
                    <span class="info-label">Collections:</span>
                    <span class="info-value" id="dashboardStatCollections">-</span>
                </div>
                <div class="db-info-item">
                    <span class="info-label">Documents:</span>
                    <span class="info-value" id="dashboardStatDocuments">-</span>
                </div>
                <div class="db-info-item">
                    <span class="info-label">Vectorized:</span>
                    <span class="info-value" id="dashboardStatVectorized">-</span>
                </div>
                <div class="db-info-item">
                    <span class="info-label">Status:</span>
                    <span class="info-value" id="dashboardStatStatus">Connected</span>
                </div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Collections</div>
                <div class="stat-value">${stats.collections}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Queries</div>
                <div class="stat-value">${stats.queries}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Records Processed</div>
                <div class="stat-value">${stats.records}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Vector Embeddings</div>
                <div class="stat-value">${stats.vectors}</div>
            </div>
        </div>

        ${getDatabaseSchemaDisplay()}
        ${getVisualSchemaDisplay()}

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Recent Activity</h3>
                <p class="card-subtitle">Your latest queries and operations</p>
            </div>
            ${getRecentActivity()}
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Quick Actions</h3>
            </div>
            <div class="btn-group">
                <button class="btn btn-primary" onclick="navigateTo('upload')">Upload Database</button>
                <button class="btn" onclick="navigateTo('query')">New Query</button>
                <button class="btn" onclick="navigateTo('results')">View Results</button>
                <button class="btn btn-secondary" onclick="loadSampleChartData()">Test Charts</button>
            </div>
        </div>
    `;
}

function getStats() {
    const totalRecords = AppState.schema ? AppState.schema.reduce((sum, t) => sum + (t.records || 0), 0) : 0;
    const totalVectors = AppState.vectorStats ? AppState.vectorStats.total_vectors || 0 : 0;
    
    return {
        collections: AppState.availableCollections.length,
        queries: AppState.queryHistory.length,
        records: totalRecords,
        vectors: totalVectors
    };
}

async function switchDashboardDatabase(dbKey) {
    AppState.currentDatabase = dbKey;
    
    // Show loading
    showAlert('Loading database...', 'info');
    
    try {
        // Load collections for selected database
        const collections = await API.getCollections(dbKey);
        AppState.availableCollections = collections.collections || [];
        
        // Update schema with new collection data
        if (AppState.availableCollections.length > 0) {
            const schemas = AppState.availableCollections.map(col => ({
                name: col.name,
                columns: [],
                records: col.document_count || 0,
                vectorized: col.vectorized || false,
                vector_count: col.vector_count || 0
            }));
            
            AppState.schema = schemas;
            AppState.currentCollection = schemas[0].name;
        } else {
            AppState.schema = [];
            AppState.currentCollection = null;
        }
        
        // Get vector stats for the new database
        try {
            const vectorStats = await API.get(`/vectors/stats?db_key=${dbKey}`);
            AppState.vectorStats = vectorStats;
        } catch (err) {
            console.error('Failed to load vector stats:', err);
            AppState.vectorStats = { total_vectors: 0 };
        }
        
        // Re-render dashboard with new data
        navigateTo('dashboard');
        
        showAlert(`Switched to database: ${dbKey}`, 'success');
    } catch (error) {
        console.error('Failed to switch database:', error);
        showAlert(`Failed to switch database: ${error.message}`, 'error');
    }
}

function getDatabaseSchemaDisplay() {
    if (!AppState.schema || AppState.schema.length === 0) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Database Schema</h3>
                    <p class="card-subtitle">No database loaded</p>
                </div>
                <div class="empty-state">
                    <p class="empty-state-text">Upload a database to view its schema</p>
                    <button class="btn btn-primary" onclick="navigateTo('upload')">Upload Database</button>
                </div>
            </div>
        `;
    }

    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Database Schema Overview</h3>
                <p class="card-subtitle">Interactive view of your database structure</p>
                <div class="view-toggle-container">
                    <label class="view-toggle-label">
                        <input type="checkbox" id="visualSchemaToggle" onchange="toggleSchemaView()" class="toggle-checkbox">
                        <span class="toggle-slider"></span>
                        <span class="toggle-text">Visual Diagram</span>
                    </label>
                </div>
            </div>
            
            <div class="schema-overview">
                ${AppState.schema.map((table, index) => `
                    <div class="schema-table-card">
                        <div class="schema-table-header" onclick="toggleTableDetails('table-${index}')">
                            <div class="schema-table-info">
                                <h4 class="schema-table-name">
                                    ${table.name}
                                </h4>
                                <div class="schema-table-meta">
                                    <span class="meta-badge">${table.columns.length} columns</span>
                                    <span class="meta-badge">${table.records.toLocaleString()} records</span>
                                </div>
                            </div>
                            <button class="expand-btn" id="expand-table-${index}">▼</button>
                        </div>
                        
                        <div class="schema-table-details" id="table-${index}" style="display: none;">
                            <div class="columns-grid">
                                ${table.columns.map((col, colIndex) => `
                                    <div class="column-item">
                                        <div class="column-header">
                                            <span class="column-name">${col}</span>
                                        </div>
                                        <div class="column-type">${getColumnType(col, colIndex)}</div>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <div class="table-actions">
                                <button class="btn btn-sm" onclick="navigateTo('query')">Query Table</button>
                                <button class="btn btn-sm" onclick="viewTablePreview('${table.name}')">View Data</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="schema-summary">
                <div class="summary-item">
                    <span class="summary-label">Total Tables:</span>
                    <span class="summary-value">${AppState.schema.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Columns:</span>
                    <span class="summary-value">${AppState.schema.reduce((sum, t) => sum + t.columns.length, 0)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Records:</span>
                    <span class="summary-value">${AppState.schema.reduce((sum, t) => sum + t.records, 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `;
}

function toggleTableDetails(tableId) {
    const details = document.getElementById(tableId);
    const expandBtn = document.getElementById('expand-' + tableId);
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        expandBtn.textContent = '▲';
        expandBtn.classList.add('expanded');
    } else {
        details.style.display = 'none';
        expandBtn.textContent = '▼';
        expandBtn.classList.remove('expanded');
    }
}

function getColumnType(columnName, index) {
    const name = columnName.toLowerCase();
    if (name === 'id' || name.endsWith('_id')) return 'INTEGER (Primary Key)';
    if (name.includes('email')) return 'VARCHAR(255)';
    if (name.includes('phone')) return 'VARCHAR(20)';
    if (name.includes('date')) return 'DATE';
    if (name.includes('time')) return 'TIMESTAMP';
    if (name.includes('price') || name.includes('amount') || name.includes('cost')) return 'DECIMAL(10,2)';
    if (name.includes('description') || name.includes('comment')) return 'TEXT';
    if (name.includes('status') || name.includes('category')) return 'VARCHAR(50)';
    return 'VARCHAR(100)';
}

function viewTablePreview(tableName) {
    showAlert(`Preview for table "${tableName}" would appear here`, 'info');
    navigateTo('results');
}

function getRecentActivity() {
    if (AppState.queryHistory.length === 0) {
        return `
            <div class="empty-state">
                <p class="empty-state-text">No recent activity. Start by uploading a database.</p>
                <button class="btn btn-primary" onclick="navigateTo('upload')">Upload Database</button>
            </div>
        `;
    }
    
    return `
        <div class="history-list">
            ${AppState.queryHistory.slice(0, 5).map(item => `
                <div class="history-item">
                    <div class="history-content">
                        <div class="history-query">${item.query}</div>
                        <div class="history-meta">${item.timestamp} • ${item.resultCount} results</div>
                    </div>
                    <button class="btn" onclick="navigateTo('query')">View</button>
                </div>
            `).join('')}
        </div>
    `;
}

function getVisualSchemaDisplay() {
    if (!AppState.schema || AppState.schema.length === 0) {
        return '';
    }

    // Find relationships between tables based on shared column names
    const relationships = findTableRelationships(AppState.schema);

    return `
        <div class="card visual-schema-card" id="visualSchemaCard" style="display: none;">
            <div class="card-header">
                <div>
                    <h3 class="card-title">Visual Schema Diagram</h3>
                    <p class="card-subtitle">Click on any table to expand and view details</p>
                </div>
                <div class="schema-controls">
                    <button class="btn btn-sm btn-secondary" onclick="expandAllTables()">Expand All</button>
                    <button class="btn btn-sm btn-secondary" onclick="collapseAllTables()">Collapse All</button>
                </div>
            </div>
            
            <div class="visual-schema-container">
                <svg id="relationshipLines" class="relationship-svg"></svg>
                <div class="schema-boxes-container" id="schemaBoxesContainer">
                    ${AppState.schema.map((table, index) => generateTableBox(table, index, relationships)).join('')}
                </div>
            </div>
            
            <div class="schema-legend">
                <div class="legend-item">
                    <span class="legend-icon pk-icon">🔑</span>
                    <span>Primary Key</span>
                </div>
                <div class="legend-item">
                    <span class="legend-icon fk-icon">🔗</span>
                    <span>Foreign Key</span>
                </div>
                <div class="legend-item">
                    <span class="legend-line"></span>
                    <span>Relationship</span>
                </div>
            </div>
        </div>
    `;
}

function generateTableBox(table, index, relationships) {
    // Identify primary keys and foreign keys
    const primaryKeys = table.columns.filter(col => 
        col.toLowerCase() === 'id' || 
        col.toLowerCase() === `${table.name.toLowerCase()}_id`
    );
    
    const foreignKeys = table.columns.filter(col => 
        col.toLowerCase().endsWith('_id') && 
        !primaryKeys.includes(col)
    );
    
    const regularColumns = table.columns.filter(col => 
        !primaryKeys.includes(col) && !foreignKeys.includes(col)
    );

    // Get connected tables
    const connectedTables = relationships
        .filter(r => r.from === table.name || r.to === table.name)
        .map(r => r.from === table.name ? r.to : r.from);

    const totalColumns = table.columns.length;
    const pkCount = primaryKeys.length;
    const fkCount = foreignKeys.length;

    return `
        <div class="schema-box" id="schema-box-${index}" 
             data-table="${table.name}" 
             data-index="${index}"
             data-locked="false"
             onmouseenter="highlightConnections('${table.name}', true)"
             onmouseleave="highlightConnections('${table.name}', false)"
             onclick="toggleTableLock('schema-box-${index}', event)">
            
            <div class="schema-box-header">
                <div class="schema-box-title-wrapper">
                    <h4 class="schema-box-title">${table.name}</h4>
                    <div class="schema-box-badge">${totalColumns}</div>
                </div>
                <div class="schema-box-mini-info">
                    ${table.records.toLocaleString()} rows
                    ${fkCount > 0 ? ` • ${fkCount} FK` : ''}
                </div>
            </div>
            
            <div class="schema-box-expanded-content" id="expanded-${index}">
                <div class="schema-section">
                    <div class="schema-section-title">Primary Keys</div>
                    ${primaryKeys.length > 0 ? primaryKeys.map(col => `
                        <div class="schema-column-compact pk">
                            <span class="col-icon">🔑</span>
                            <span>${col}</span>
                        </div>
                    `).join('') : '<div class="schema-empty">None</div>'}
                </div>
                
                <div class="schema-section">
                    <div class="schema-section-title">Foreign Keys</div>
                    ${foreignKeys.length > 0 ? foreignKeys.map(col => `
                        <div class="schema-column-compact fk">
                            <span class="col-icon">�</span>
                            <span>${col}</span>
                        </div>
                    `).join('') : '<div class="schema-empty">None</div>'}
                </div>
                
                <div class="schema-section">
                    <div class="schema-section-title">Columns (${regularColumns.length})</div>
                    <div class="schema-columns-grid">
                        ${regularColumns.map(col => `
                            <div class="schema-column-compact">
                                <span>${col}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${connectedTables.length > 0 ? `
                    <div class="schema-connections-section">
                        <div class="connections-title">⟷ Connected to:</div>
                        <div class="connections-tags">
                            ${connectedTables.map(t => `
                                <span class="conn-tag" onclick="event.stopPropagation(); highlightConnection('${table.name}', '${t}')">${t}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="schema-box-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); viewTableData('${table.name}')">
                        <span>View Data</span>
                    </button>
                    <button class="action-btn secondary" onclick="event.stopPropagation(); queryTable('${table.name}')">
                        <span>Query</span>
                    </button>
                </div>
            </div>
            
            <div class="lock-indicator" id="lock-${index}">📌</div>
        </div>
    `;
}

function toggleTableLock(boxId, event) {
    event.stopPropagation();
    const box = document.getElementById(boxId);
    const index = box.dataset.index;
    const expanded = document.getElementById(`expanded-${index}`);
    const lockIndicator = document.getElementById(`lock-${index}`);
    
    const isLocked = box.dataset.locked === 'true';
    
    if (isLocked) {
        // Unlock and collapse
        box.dataset.locked = 'false';
        box.classList.remove('locked');
        lockIndicator.classList.remove('visible');
    } else {
        // Lock and keep expanded
        box.dataset.locked = 'true';
        box.classList.add('locked');
        lockIndicator.classList.add('visible');
    }
    
    // Redraw lines
    setTimeout(() => drawRelationshipLines(), 100);
}

function highlightConnections(tableName, isHighlighted) {
    const box = document.querySelector(`[data-table="${tableName}"]`);
    if (!box) return;
    
    const index = box.dataset.index;
    const expandedContent = document.getElementById(`expanded-${index}`);
    const isLocked = box.dataset.locked === 'true';
    
    if (isHighlighted) {
        box.classList.add('hovered');
        
        // First, collapse ALL other expanded content that's not locked
        document.querySelectorAll('.schema-box-expanded-content').forEach((content, idx) => {
            const contentBox = content.closest('.schema-box');
            if (contentBox && contentBox !== box && contentBox.dataset.locked !== 'true') {
                content.style.maxHeight = '0';
                content.style.opacity = '0';
                setTimeout(() => {
                    content.style.display = 'none';
                }, 300);
            }
        });
        
        // Expand ONLY this table on hover (unless already locked)
        if (!isLocked && expandedContent) {
            expandedContent.style.display = 'block';
            setTimeout(() => {
                expandedContent.style.maxHeight = expandedContent.scrollHeight + 'px';
                expandedContent.style.opacity = '1';
            }, 10);
        }
        
        // Highlight relationship lines
        document.querySelectorAll('.relationship-line').forEach(line => {
            if (line.dataset.from === tableName || line.dataset.to === tableName) {
                line.classList.add('highlighted');
            } else {
                line.classList.add('dimmed');
            }
        });
        
        // Just highlight connected boxes with subtle border, DON'T expand them
        const relationships = findTableRelationships(AppState.schema);
        const connected = relationships
            .filter(r => r.from === tableName || r.to === tableName)
            .map(r => r.from === tableName ? r.to : r.from);
        
        connected.forEach(connectedTable => {
            const connectedBox = document.querySelector(`[data-table="${connectedTable}"]`);
            if (connectedBox && connectedBox.dataset.locked !== 'true') {
                connectedBox.classList.add('connected-highlight');
            }
        });
        
        // Redraw lines to account for expanded size
        setTimeout(() => drawRelationshipLines(), 320);
        
    } else {
        box.classList.remove('hovered');
        
        // Collapse ONLY this table on hover out (unless locked)
        if (!isLocked && expandedContent) {
            expandedContent.style.maxHeight = '0';
            expandedContent.style.opacity = '0';
            setTimeout(() => {
                expandedContent.style.display = 'none';
            }, 300);
        }
        
        // Remove highlights
        document.querySelectorAll('.relationship-line').forEach(line => {
            line.classList.remove('highlighted', 'dimmed');
        });
        
        document.querySelectorAll('.schema-box').forEach(b => {
            b.classList.remove('connected-highlight');
        });
        
        // Redraw lines after collapse
        setTimeout(() => drawRelationshipLines(), 320);
    }
}

function highlightConnection(fromTable, toTable) {
    // Highlight specific connection
    document.querySelectorAll('.relationship-line').forEach(line => {
        if ((line.dataset.from === fromTable && line.dataset.to === toTable) ||
            (line.dataset.from === toTable && line.dataset.to === fromTable)) {
            line.classList.add('pulse');
            setTimeout(() => line.classList.remove('pulse'), 1000);
        }
    });
}

function viewTableData(tableName) {
    showAlert(`Viewing data for table: ${tableName}`, 'info');
    // You can add actual data viewing logic here
    navigateTo('query');
}

function queryTable(tableName) {
    showAlert(`Query builder for table: ${tableName}`, 'info');
    navigateTo('query');
}

function expandAllTables() {
    document.querySelectorAll('.schema-box').forEach(box => {
        box.classList.add('locked');
        box.dataset.locked = 'true';
        const index = box.dataset.index;
        const lockIndicator = document.getElementById(`lock-${index}`);
        if (lockIndicator) lockIndicator.classList.add('visible');
    });
}

function collapseAllTables() {
    document.querySelectorAll('.schema-box').forEach(box => {
        box.classList.remove('locked', 'hovered');
        box.dataset.locked = 'false';
        const index = box.dataset.index;
        const lockIndicator = document.getElementById(`lock-${index}`);
        if (lockIndicator) lockIndicator.classList.remove('visible');
    });
}

function findTableRelationships(schema) {
    const relationships = [];
    
    schema.forEach(table => {
        table.columns.forEach(column => {
            // Find foreign key relationships
            if (column.toLowerCase().endsWith('_id') && column.toLowerCase() !== 'id') {
                const referencedTableName = column.toLowerCase().replace('_id', '');
                
                // Find matching table
                const referencedTable = schema.find(t => 
                    t.name.toLowerCase() === referencedTableName ||
                    t.name.toLowerCase() === referencedTableName + 's' ||
                    t.name.toLowerCase() === referencedTableName.slice(0, -1)
                );
                
                if (referencedTable) {
                    relationships.push({
                        from: table.name,
                        to: referencedTable.name,
                        fromColumn: column,
                        toColumn: 'id',
                        type: 'foreign_key'
                    });
                }
            }
        });
    });
    
    return relationships;
}

function toggleSchemaView() {
    const toggle = document.getElementById('visualSchemaToggle');
    const visualCard = document.getElementById('visualSchemaCard');
    const traditionalSchema = document.querySelector('.schema-overview');
    
    if (toggle.checked) {
        // Show visual diagram
        visualCard.style.display = 'block';
        if (traditionalSchema) traditionalSchema.style.display = 'none';
        
        // Draw relationship lines after a short delay to ensure boxes are rendered
        setTimeout(drawRelationshipLines, 100);
    } else {
        // Show traditional list
        visualCard.style.display = 'none';
        if (traditionalSchema) traditionalSchema.style.display = 'block';
    }
}

function drawRelationshipLines() {
    const container = document.querySelector('.visual-schema-container');
    const svg = document.getElementById('relationshipLines');
    
    if (!container || !svg) return;
    
    // Clear existing lines
    svg.innerHTML = '';
    
    // Set SVG dimensions to match container
    const containerRect = container.getBoundingClientRect();
    svg.setAttribute('width', containerRect.width);
    svg.setAttribute('height', containerRect.height);
    
    const relationships = findTableRelationships(AppState.schema);
    
    relationships.forEach((rel, index) => {
        const fromBox = document.querySelector(`[data-table="${rel.from}"]`);
        const toBox = document.querySelector(`[data-table="${rel.to}"]`);
        
        if (!fromBox || !toBox) return;
        
        const fromRect = fromBox.getBoundingClientRect();
        const toRect = toBox.getBoundingClientRect();
        const containerOffset = container.getBoundingClientRect();
        
        // Calculate line coordinates
        const x1 = fromRect.right - containerOffset.left;
        const y1 = fromRect.top + fromRect.height / 2 - containerOffset.top;
        const x2 = toRect.left - containerOffset.left;
        const y2 = toRect.top + toRect.height / 2 - containerOffset.top;
        
        // Check if boxes are side by side or stacked
        const isSideBySide = Math.abs(y1 - y2) < 50;
        
        let path;
        if (isSideBySide) {
            // Straight line for side-by-side boxes
            const midX = (x1 + x2) / 2;
            path = `M ${x1} ${y1} Q ${midX} ${y1}, ${midX} ${(y1 + y2) / 2} T ${x2} ${y2}`;
        } else {
            // Curved path for stacked boxes
            const controlX1 = x1 + 50;
            const controlX2 = x2 - 50;
            path = `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;
        }
        
        // Create path element
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        pathElement.setAttribute('stroke', 'rgba(217, 119, 6, 0.4)');
        pathElement.setAttribute('stroke-width', '2');
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('stroke-dasharray', '5,5');
        pathElement.setAttribute('class', `relationship-line line-${rel.from}-${rel.to}`);
        pathElement.dataset.from = rel.from;
        pathElement.dataset.to = rel.to;
        
        // Add arrow marker
        const markerId = `arrow-${index}`;
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', markerId);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('markerUnits', 'strokeWidth');
        
        const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
        arrowPath.setAttribute('fill', 'rgba(217, 119, 6, 0.4)');
        
        marker.appendChild(arrowPath);
        svg.appendChild(marker);
        
        pathElement.setAttribute('marker-end', `url(#${markerId})`);
        svg.appendChild(pathElement);
    });
    
    // Add hover effects for boxes to highlight their connections
    document.querySelectorAll('.schema-box').forEach(box => {
        box.addEventListener('mouseenter', function() {
            const tableName = this.dataset.table;
            document.querySelectorAll('.relationship-line').forEach(line => {
                if (line.dataset.from === tableName || line.dataset.to === tableName) {
                    line.setAttribute('stroke', 'rgba(217, 119, 6, 0.9)');
                    line.setAttribute('stroke-width', '3');
                } else {
                    line.setAttribute('stroke', 'rgba(217, 119, 6, 0.15)');
                }
            });
        });
        
        box.addEventListener('mouseleave', function() {
            document.querySelectorAll('.relationship-line').forEach(line => {
                line.setAttribute('stroke', 'rgba(217, 119, 6, 0.4)');
                line.setAttribute('stroke-width', '2');
            });
        });
    });
}