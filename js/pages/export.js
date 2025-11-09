// js/pages/export.js - Export Page Module

function ExportPage() {
    return `
        ${AppState.queryResults.length === 0 ? `
            <div class="alert alert-info">
                ℹ️ No data available to export. Execute a query first to generate exportable data.
            </div>
        ` : ''}

        <div class="export-grid">
            <div class="card export-option-card">
                <div class="export-icon">📄</div>
                <div class="card-header">
                    <h3 class="card-title">Export as CSV</h3>
                    <p class="card-subtitle">Spreadsheet-compatible format</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Delimiter</label>
                    <select id="csvDelimiter" class="form-input select-modern">
                        <option value=",">Comma (,)</option>
                        <option value=";">Semicolon (;)</option>
                        <option value="\t">Tab</option>
                    </select>
                </div>
                
                <button class="btn btn-accent btn-block" onclick="exportCSV()">Download CSV</button>
            </div>

            <div class="card export-option-card">
                <div class="export-icon">{ }</div>
                <div class="card-header">
                    <h3 class="card-title">Export as JSON</h3>
                    <p class="card-subtitle">Developer-friendly format</p>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="jsonPretty" checked class="checkbox-modern">
                        <span>Pretty print (formatted)</span>
                    </label>
                </div>
                
                <button class="btn btn-accent btn-block" onclick="exportJSON()">Download JSON</button>
            </div>

            <div class="card export-option-card">
                <div class="export-icon">📊</div>
                <div class="card-header">
                    <h3 class="card-title">Export Chart</h3>
                    <p class="card-subtitle">Save visualization as image</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Image Format</label>
                    <select id="imageFormat" class="form-input select-modern">
                        <option value="png">PNG (High Quality)</option>
                        <option value="jpeg">JPEG (Compressed)</option>
                    </select>
                </div>
                
                <button class="btn btn-accent btn-block" onclick="exportChart()">Download Image</button>
            </div>

            <div class="card export-option-card export-all-card">
                <div class="export-icon">📦</div>
                <div class="card-header">
                    <h3 class="card-title">Export Everything</h3>
                    <p class="card-subtitle">Download complete package (CSV + JSON + Chart)</p>
                </div>
                
                <button class="btn btn-accent btn-block btn-large" onclick="exportAll()">
                    <span>Download All Files</span> →
                </button>
            </div>
        </div>
    `;
}

async function exportCSV() {
    if (AppState.queryResults.length === 0) {
        showAlert('No data available to export', 'error');
        return;
    }

    // Try API export first if connected
    if (AppState.apiConnected) {
        try {
            await API.exportToExcel({ results: AppState.queryResults });
            showAlert('Excel file exported successfully via API', 'success');
            return;
        } catch (error) {
            console.error('API export failed, using client-side export:', error);
        }
    }

    // Fallback to client-side export
    const delimiter = document.getElementById('csvDelimiter').value;
    const results = AppState.queryResults;

    let csv = Object.keys(results[0]).join(delimiter) + '\n';
    
    results.forEach(row => {
        csv += Object.values(row).join(delimiter) + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'export-' + Date.now() + '.csv';
    link.click();
    window.URL.revokeObjectURL(url);

    showAlert('CSV file exported successfully', 'success');
}

function exportJSON() {
    if (AppState.queryResults.length === 0) {
        showAlert('No data available to export', 'error');
        return;
    }

    const prettyPrint = document.getElementById('jsonPretty').checked;
    const data = {
        results: AppState.queryResults,
        metadata: {
            exportDate: new Date().toISOString(),
            recordCount: AppState.queryResults.length
        }
    };

    const json = prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);

    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'export-' + Date.now() + '.json';
    link.click();
    window.URL.revokeObjectURL(url);

    showAlert('JSON file exported successfully', 'success');
}

function exportChart() {
    if (!AppState.currentChart) {
        showAlert('No chart available. Please visit the Results page first.', 'error');
        return;
    }

    const format = document.getElementById('imageFormat').value;

    const link = document.createElement('a');
    link.download = 'chart-' + Date.now() + '.' + format;
    
    if (format === 'png') {
        link.href = AppState.currentChart.toBase64Image();
    } else {
        link.href = AppState.currentChart.toBase64Image('image/jpeg', 0.9);
    }
    
    link.click();
    showAlert('Chart image exported successfully', 'success');
}

async function exportAll() {
    if (AppState.queryResults.length === 0) {
        showAlert('No data available to export', 'error');
        return;
    }

    showAlert('Exporting all formats...', 'info');

    await new Promise(resolve => setTimeout(resolve, 300));
    await exportCSV();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    exportJSON();
    
    if (AppState.currentChart) {
        await new Promise(resolve => setTimeout(resolve, 300));
        exportChart();
    }

    setTimeout(() => {
        showAlert('All files exported successfully', 'success');
    }, 300);
}