// js/pages/settings.js - Settings Page Module

function SettingsPage() {
    return `
        <div class="settings-container">
            <div class="card settings-card">
                <div class="card-header">
                    <h3 class="card-title">⚙️ Query Settings</h3>
                    <p class="card-subtitle">Configure your query preferences</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Query History Limit</label>
                    <p class="form-help">Maximum number of queries to keep in history</p>
                    <input type="number" id="historyLimit" class="form-input input-modern" value="10" min="5" max="100">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Default Chart Type</label>
                    <p class="form-help">Preferred visualization for query results</p>
                    <select id="defaultChartType" class="form-input select-modern">
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="pie">Pie Chart</option>
                        <option value="doughnut">Doughnut Chart</option>
                    </select>
                </div>
                
                <button class="btn btn-accent" onclick="saveSettings()">Save Changes</button>
            </div>

            <div class="card settings-card">
                <div class="card-header">
                    <h3 class="card-title">📤 Export Preferences</h3>
                    <p class="card-subtitle">Default export settings</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Default Export Format</label>
                    <p class="form-help">Preferred file format for exports</p>
                    <select id="defaultExportFormat" class="form-input select-modern">
                        <option value="csv">CSV (Comma-Separated Values)</option>
                        <option value="json">JSON (JavaScript Object Notation)</option>
                        <option value="xlsx">XLSX (Excel Workbook)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">CSV Delimiter</label>
                    <p class="form-help">Character to separate values in CSV files</p>
                    <select id="defaultCsvDelimiter" class="form-input select-modern">
                        <option value=",">Comma (,)</option>
                        <option value=";">Semicolon (;)</option>
                        <option value="\t">Tab (\\t)</option>
                    </select>
                </div>
                
                <button class="btn btn-accent" onclick="saveSettings()">Save Changes</button>
            </div>

            <div class="card settings-card danger-card">
                <div class="card-header">
                    <h3 class="card-title">🗑️ Data Management</h3>
                    <p class="card-subtitle">Manage your stored data</p>
                </div>
                
                <p class="danger-text">
                    Clear all cached data, uploaded files, and query history. This action cannot be undone.
                </p>
                
                <button class="btn btn-danger" onclick="clearAllData()">Clear All Data</button>
            </div>
        </div>
    `;
}

function saveSettings() {
    showAlert('Settings saved successfully', 'success');
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        AppState.uploadedFile = null;
        AppState.schema = null;
        AppState.queryResults = [];
        AppState.queryHistory = [];
        AppState.currentChart = null;
        
        showAlert('All data cleared successfully', 'success');
        navigateTo('dashboard');
    }
}