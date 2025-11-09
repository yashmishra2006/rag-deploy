// js/pages/upload.js - Upload Page Module

function UploadPage() {
    return `
        <div class="upload-container">
            <!-- MongoDB Connection Management -->
            <div class="card mb-2">
                <div class="card-header">
                    <h3 class="card-title">MongoDB Connection</h3>
                    <p class="card-subtitle">Connect to your MongoDB database or add a new one</p>
                </div>
                <div class="form-group">
                    <label for="dbSelect">Current Database:</label>
                    <select id="dbSelect" class="form-control" onchange="switchDatabase(this.value)">
                        ${AppState.databases.map(db => `
                            <option value="${db.key}" ${db.key === AppState.currentDatabase ? 'selected' : ''}>
                                ${db.name} (${db.key}) ${db.status === 'connected' ? '[Connected]' : '[Disconnected]'}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="db-stats" id="currentDbStats">
                    <div class="stat-item">
                        <span class="stat-label">Collections:</span>
                        <span class="stat-value" id="statCollections">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Documents:</span>
                        <span class="stat-value" id="statDocuments">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Vectorized:</span>
                        <span class="stat-value" id="statVectorized">-</span>
                    </div>
                </div>
                
                <div class="btn-group mt-1">
                    <button class="btn btn-secondary" onclick="toggleAddNewDb()">
                        Add New Database
                    </button>
                    <button class="btn btn-accent" onclick="vectorizeAllInCurrentDb()" 
                            title="Vectorize all collections in current database">
                        Vectorize All
                    </button>
                    <button class="btn btn-warning" onclick="deleteAllEmbeddings()" 
                            title="Delete all vector embeddings for this database">
                        Clear All Vectors
                    </button>
                    <button class="btn btn-danger" onclick="removeCurrentDatabase()" 
                            ${AppState.currentDatabase === 'primary' ? 'disabled title="Cannot remove primary database"' : ''}>
                        Remove Current
                    </button>
                </div>
                
                <div id="newDbForm" class="hidden mt-1">
                    <div class="form-group">
                        <label for="newDbSrv">MongoDB SRV Connection String:</label>
                        <input type="text" id="newDbSrv" class="form-control" 
                               placeholder="mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority">
                    </div>
                    <div class="form-group">
                        <label for="newDbName">Database Name:</label>
                        <input type="text" id="newDbName" class="form-control" placeholder="myDatabase">
                    </div>
                    <div class="form-group">
                        <label for="newDbKey">Database Key (unique identifier):</label>
                        <input type="text" id="newDbKey" class="form-control" placeholder="secondary">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="autoVectorizeNewDb"> 
                            Auto-Vectorize all collections after connecting
                        </label>
                        <small style="color: #9ca3af; display: block; margin-top: 0.25rem;">
                            Automatically create embeddings for all collections in this database
                        </small>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-accent" onclick="addNewDatabase()">Connect Database</button>
                        <button class="btn btn-secondary" onclick="toggleAddNewDb()">Cancel</button>
                    </div>
                </div>
            </div>

            <div class="card upload-card">
                <div class="card-header">
                    <h3 class="card-title">Upload Database File</h3>
                    <p class="card-subtitle">Supported formats: CSV, JSON • Maximum size: 100MB</p>
                </div>
                
                <div class="form-group">
                    <label for="targetDbSelect">Upload to Database:</label>
                    <select id="targetDbSelect" class="form-control">
                        ${AppState.databases.map(db => `
                            <option value="${db.key}" ${db.key === AppState.currentDatabase ? 'selected' : ''}>
                                ${db.name} (${db.key})
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="collectionNameInput">Collection Name:</label>
                    <input type="text" id="collectionNameInput" class="form-control" 
                           placeholder="Enter collection name (e.g., users, products)" value="uploaded_data">
                </div>

                <div class="form-group">
                    <label>
                        <input type="checkbox" id="autoVectorizeCheck"> 
                        Auto-Vectorize (Create embeddings for AI search)
                    </label>
                </div>
                
                <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
                    <div class="upload-icon">[FILE]</div>
                    <p class="upload-text-main">Drop your file here or click to browse</p>
                    <p class="upload-text-sub">Drag and drop files to upload instantly</p>
                    <input type="file" id="fileInput" accept=".csv,.json" style="display: none;">
                </div>

                <div class="file-formats">
                    <span class="format-badge">CSV</span>
                    <span class="format-badge">JSON</span>
                </div>

                <div id="uploadProgress" class="hidden mt-1">
                    <div class="progress-container">
                        <div class="progress-bar" id="progressBar"></div>
                    </div>
                    <p class="progress-text" id="progressText">Uploading... 0%</p>
                </div>
            </div>

            <!-- Vectorization Section -->
            <div class="card mt-2">
                <div class="card-header">
                    <h3 class="card-title">Vectorize Collections</h3>
                    <p class="card-subtitle">Create AI embeddings for semantic search capabilities</p>
                </div>
                
                <div class="form-group">
                    <label for="vectorizeDbSelect">Database:</label>
                    <select id="vectorizeDbSelect" class="form-control" onchange="loadCollectionsForVectorization()">
                        ${AppState.databases.map(db => `
                            <option value="${db.key}" ${db.key === AppState.currentDatabase ? 'selected' : ''}>
                                ${db.name} (${db.key})
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="vectorizeCollectionSelect">Collection:</label>
                    <select id="vectorizeCollectionSelect" class="form-control">
                        <option value="">Select a collection...</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="textFieldsInput">Text Fields (comma-separated):</label>
                    <input type="text" id="textFieldsInput" class="form-control" 
                           placeholder="e.g., title, description, content" 
                           value="title,description,content,text,name">
                    <small style="color: #9ca3af; display: block; margin-top: 0.25rem;">
                        Specify which fields contain text to be vectorized
                    </small>
                </div>
                
                <div class="form-group">
                    <label for="chunkSizeInput">Chunk Size:</label>
                    <input type="number" id="chunkSizeInput" class="form-control" 
                           value="500" min="100" max="2000" step="100">
                    <small style="color: #9ca3af; display: block; margin-top: 0.25rem;">
                        Number of characters per chunk (100-2000)
                    </small>
                </div>
                
                <button class="btn btn-accent" onclick="startVectorization()">
                    Start Vectorization
                </button>
                
                <div id="vectorizationProgress" class="hidden mt-1">
                    <div class="alert alert-info">
                        <strong>Vectorization in progress...</strong>
                        <p id="vectorizationStatus">Preparing to vectorize collection...</p>
                    </div>
                </div>
                
                <div id="vectorizationResult" class="hidden mt-1">
                    <div class="alert alert-success">
                        <strong>Vectorization Complete!</strong>
                        <p id="vectorizationDetails"></p>
                    </div>
                </div>
            </div>

            <div id="schemaPreview" class="hidden">
                <div class="card schema-preview-card">
                    <div class="card-header">
                        <h3 class="card-title">Database Schema Preview</h3>
                        <p class="card-subtitle">Successfully detected and parsed your database structure</p>
                    </div>
                    <div class="alert alert-success">
                        [SUCCESS] File uploaded successfully
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Table Name</th>
                                    <th>Columns</th>
                                    <th>Records</th>
                                </tr>
                            </thead>
                            <tbody id="schemaBody"></tbody>
                        </table>
                    </div>
                    <div class="btn-group mt-2">
                        <button class="btn btn-accent" onclick="navigateTo('query')">Proceed to Query →</button>
                        <button class="btn btn-secondary" onclick="resetUpload()">Upload Another File</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initializeUploadPage() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    // Load current database stats
    loadCurrentDbStats();
    
    // Load collections for vectorization
    loadCollectionsForVectorization();

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        handleFileUpload(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0]);
    });
}

async function loadCurrentDbStats() {
    try {
        const dbKey = AppState.currentDatabase || 'primary';
        const collections = await API.getCollections(dbKey);
        
        const totalCollections = collections.collections.length;
        const totalDocs = collections.collections.reduce((sum, col) => sum + col.document_count, 0);
        const vectorized = collections.collections.filter(col => col.vectorized).length;
        
        document.getElementById('statCollections').textContent = totalCollections;
        document.getElementById('statDocuments').textContent = totalDocs.toLocaleString();
        document.getElementById('statVectorized').textContent = `${vectorized}/${totalCollections}`;
    } catch (error) {
        console.error('Failed to load DB stats:', error);
    }
}

async function switchDatabase(dbKey) {
    AppState.currentDatabase = dbKey;
    await loadCurrentDbStats();
    
    // Update target database dropdown
    document.getElementById('targetDbSelect').value = dbKey;
    
    // Reload schema if on dashboard
    if (AppState.currentPage === 'dashboard') {
        await loadSchemaFromAPI();
    }
    
    showAlert(`Switched to database: ${dbKey}`, 'success');
}

function toggleAddNewDb() {
    const form = document.getElementById('newDbForm');
    form.classList.toggle('hidden');
}

async function addNewDatabase() {
    const srv = document.getElementById('newDbSrv').value.trim();
    const dbName = document.getElementById('newDbName').value.trim();
    const dbKey = document.getElementById('newDbKey').value.trim();
    const autoVectorize = document.getElementById('autoVectorizeNewDb').checked;
    
    if (!srv || !dbName || !dbKey) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    if (!srv.startsWith('mongodb+srv://') && !srv.startsWith('mongodb://')) {
        showAlert('Invalid MongoDB connection string. Must start with mongodb:// or mongodb+srv://', 'error');
        return;
    }
    
    try {
        // Show loading
        showAlert('Connecting to database...', 'info');
        
        // Save to backend permanently
        const response = await API.addDatabase(dbKey, dbName, srv, 'User-added database');
        
        if (response.status === 'success') {
            // Reload databases from backend to get updated list
            const databases = await API.getDatabases();
            AppState.databases = databases.databases || [];
            
            // Clear form
            document.getElementById('newDbSrv').value = '';
            document.getElementById('newDbName').value = '';
            document.getElementById('newDbKey').value = '';
            document.getElementById('autoVectorizeNewDb').checked = false;
            toggleAddNewDb();
            
            showAlert(`Database saved permanently: ${dbName} (${response.collections_count || 0} collections)`, 'success');
            
            // Auto-vectorize if checked
            if (autoVectorize) {
                showAlert('Starting auto-vectorization...', 'info');
                await vectorizeAllCollections(dbKey, dbName);
            }
            
            // Refresh page to show new database
            navigateTo('upload');
        } else {
            showAlert(`Failed to connect: ${response.error || 'Unknown error'}`, 'error');
        }
        
    } catch (error) {
        showAlert(`Failed to connect: ${error.message}`, 'error');
    }
}

async function removeCurrentDatabase() {
    const dbKey = AppState.currentDatabase;
    
    if (dbKey === 'primary') {
        showAlert('Cannot remove the primary database', 'error');
        return;
    }
    
    const db = AppState.databases.find(d => d.key === dbKey);
    if (!db) return;
    
    if (!confirm(`Are you sure you want to permanently remove database "${db.name}" (${dbKey})?\n\nThis will remove the connection from the system but will NOT delete any data from MongoDB.`)) {
        return;
    }
    
    try {
        showAlert('Removing database connection...', 'info');
        
        // Remove from backend
        const response = await API.removeDatabase(dbKey);
        
        if (response.status === 'success') {
            // Reload databases from backend to get updated list
            const databases = await API.getDatabases();
            AppState.databases = databases.databases || [];
            
            // Switch to primary database
            AppState.currentDatabase = 'primary';
            
            // Refresh page
            navigateTo('upload');
            
            showAlert(`Database connection removed: ${db.name}`, 'success');
        } else {
            showAlert(`Failed to remove: ${response.error || 'Unknown error'}`, 'error');
        }
        
    } catch (error) {
        showAlert(`Failed to remove: ${error.message}`, 'error');
    }
}

async function handleFileUpload(file) {
    if (!file) return;

    const validExtensions = ['csv', 'json'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
        showAlert('Invalid file type. Please upload CSV or JSON files.', 'error');
        return;
    }

    if (file.size > 100 * 1024 * 1024) {
        showAlert('File size exceeds 100MB limit.', 'error');
        return;
    }

    AppState.uploadedFile = file;
    document.getElementById('uploadProgress').classList.remove('hidden');
    
    let progress = 0;
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    // Get upload options
    const targetDb = document.getElementById('targetDbSelect').value;
    const collectionName = document.getElementById('collectionNameInput').value || 'uploaded_data';
    const autoVectorize = document.getElementById('autoVectorizeCheck').checked;
    
    // Animate progress
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + '%';
        progressText.textContent = `Uploading... ${progress}%`;
        
        if (progress >= 90) {
            clearInterval(interval);
        }
    }, 150);
    
    // Upload to API if connected
    if (AppState.apiConnected) {
        try {
            let result;
            if (fileExtension === 'csv') {
                result = await API.uploadCSV(file, targetDb, collectionName, autoVectorize);
            } else if (fileExtension === 'json') {
                result = await API.uploadJSON(file, targetDb, collectionName, autoVectorize);
            }
            
            // Complete progress
            progressBar.style.width = '100%';
            progressText.textContent = 'Upload complete!';
            
            setTimeout(() => {
                document.getElementById('uploadProgress').classList.add('hidden');
                displaySchemaFromAPI(result, targetDb);
            }, 500);
            
            let message = `Successfully uploaded ${result.records_inserted} records to ${targetDb}.${result.collection}!`;
            if (autoVectorize && result.vectorization) {
                message += ` Created ${result.vectorization.total_chunks} vector embeddings.`;
            }
            showAlert(message, 'success');
            
            // Refresh collections and stats
            const collections = await API.getCollections(targetDb);
            AppState.availableCollections = collections.collections || [];
            await loadSchemaFromAPI();
            await loadCurrentDbStats();
            
        } catch (error) {
            console.error('Upload error:', error);
            showAlert(`Upload failed: ${error.message}`, 'error');
            progressBar.style.width = '100%';
            progressText.textContent = 'Upload failed';
            
            // Fallback to sample data display
            setTimeout(() => {
                document.getElementById('uploadProgress').classList.add('hidden');
                displaySchema(file);
            }, 500);
        }
    } else {
        // Complete progress for non-API upload
        progressBar.style.width = '100%';
        progressText.textContent = 'Processing...';
        
        setTimeout(() => {
            document.getElementById('uploadProgress').classList.add('hidden');
            displaySchema(file);
        }, 300);
    }
}

function displaySchemaFromAPI(uploadResult, dbKey) {
    const schemaBody = document.getElementById('schemaBody');
    schemaBody.innerHTML = '';
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${uploadResult.collection}</td>
        <td>${uploadResult.columns ? uploadResult.columns.join(', ') : 'N/A'}</td>
        <td>${uploadResult.records_inserted}</td>
    `;
    schemaBody.appendChild(row);
    
    document.getElementById('schemaPreview').classList.remove('hidden');
    
    // Update AppState
    AppState.currentCollection = uploadResult.collection;
    AppState.currentDatabase = dbKey;
}

function displaySchema(file) {
    const sampleData = generateSampleData();
    AppState.schema = sampleData.tables;
    
    const schemaBody = document.getElementById('schemaBody');
    schemaBody.innerHTML = '';
    
    sampleData.tables.forEach(table => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${table.name}</td>
            <td>${table.columns.join(', ')}</td>
            <td>${table.records}</td>
        `;
        schemaBody.appendChild(row);
    });
    
    document.getElementById('schemaPreview').classList.remove('hidden');
}

function resetUpload() {
    document.getElementById('fileInput').value = '';
    document.getElementById('schemaPreview').classList.add('hidden');
    document.getElementById('uploadProgress').classList.add('hidden');
    AppState.uploadedFile = null;
    AppState.schema = null;
}

// ============= VECTORIZATION FUNCTIONS =============

async function loadCollectionsForVectorization() {
    try {
        const dbKey = document.getElementById('vectorizeDbSelect').value;
        const collections = await API.getCollections(dbKey);
        
        const select = document.getElementById('vectorizeCollectionSelect');
        select.innerHTML = '<option value="">Select a collection...</option>';
        
        collections.collections.forEach(col => {
            const option = document.createElement('option');
            option.value = col.name;
            option.textContent = `${col.name} (${col.document_count} docs)${col.vectorized ? ' [Vectorized]' : ''}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load collections:', error);
        showAlert('Failed to load collections', 'error');
    }
}

async function startVectorization() {
    const dbKey = document.getElementById('vectorizeDbSelect').value;
    const collectionName = document.getElementById('vectorizeCollectionSelect').value;
    const textFieldsInput = document.getElementById('textFieldsInput').value;
    const chunkSize = parseInt(document.getElementById('chunkSizeInput').value);
    
    if (!collectionName) {
        showAlert('Please select a collection to vectorize', 'error');
        return;
    }
    
    if (!textFieldsInput.trim()) {
        showAlert('Please specify text fields to vectorize', 'error');
        return;
    }
    
    const textFields = textFieldsInput.split(',').map(f => f.trim()).filter(f => f);
    
    if (textFields.length === 0) {
        showAlert('Please specify at least one text field', 'error');
        return;
    }
    
    // Show progress area with live updates
    const progressDiv = document.getElementById('vectorizationProgress');
    progressDiv.classList.remove('hidden');
    document.getElementById('vectorizationResult').classList.add('hidden');
    
    // Create detailed progress display
    const statusDiv = document.getElementById('vectorizationStatus');
    statusDiv.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <strong>Vectorizing ${collectionName}</strong>
        </div>
        <div id="vectorization-messages" style="max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 0.875rem; background: var(--background); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.75rem;">
            <div style="color: var(--text-secondary);">[PROCESSING] Initializing...</div>
        </div>
        <div class="progress-container">
            <div id="vectorization-progress-bar" class="progress-bar" style="width: 0%"></div>
        </div>
        <div id="vectorization-progress-text" class="progress-text" style="margin-top: 0.5rem;">Starting...</div>
    `;
    
    const messagesDiv = document.getElementById('vectorization-messages');
    const progressBar = document.getElementById('vectorization-progress-bar');
    const progressText = document.getElementById('vectorization-progress-text');
    
    const addMessage = (msg, type = 'info') => {
        const icon = type === 'success' ? '[OK]' : type === 'error' ? '[ERROR]' : type === 'skip' ? '[SKIP]' : '[...]';
        const color = type === 'success' ? 'var(--accent-color)' : type === 'error' ? 'var(--error-color)' : 'var(--text-secondary)';
        const line = document.createElement('div');
        line.style.color = color;
        line.textContent = `${icon} ${msg}`;
        messagesDiv.appendChild(line);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };
    
    try {
        // Use streaming API for real-time progress
        const result = await API.smartVectorizeStream(
            dbKey, 
            collectionName, 
            textFields, 
            chunkSize, 
            (update) => {
                // Handle progress updates
                if (update.stage === 'init') {
                    addMessage(update.message);
                } else if (update.stage === 'loaded') {
                    addMessage(update.message, 'success');
                } else if (update.stage === 'clearing') {
                    addMessage(update.message);
                } else if (update.stage === 'cleared') {
                    addMessage(update.message, 'success');
                } else if (update.stage === 'processing') {
                    const progress = update.progress || 0;
                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `${update.message} (${update.chunks} chunks created)`;
                    if (update.current % 20 === 0 || update.current === update.total) {
                        addMessage(`Progress: ${update.current}/${update.total} documents (${update.chunks} chunks)`);
                    }
                } else if (update.stage === 'batch_uploaded') {
                    // Silent - just update log every few batches if needed
                } else if (update.stage === 'final_batch') {
                    addMessage(update.message, 'success');
                } else if (update.stage === 'saving_state') {
                    addMessage(update.message);
                } else if (update.stage === 'complete') {
                    progressBar.style.width = '100%';
                    progressText.textContent = update.message;
                    addMessage(update.message, 'success');
                } else if (update.stage === 'skipped') {
                    addMessage(`Skipped: ${update.reason}`, 'skip');
                    progressText.textContent = 'Skipped - already vectorized';
                } else if (update.error) {
                    addMessage(`Error: ${update.error}`, 'error');
                }
            }
        );
        
        // Hide progress, show result
        setTimeout(() => {
            progressDiv.classList.add('hidden');
            document.getElementById('vectorizationResult').classList.remove('hidden');
            
            if (result.status === 'success') {
                const details = `
                    Collection: ${collectionName}<br>
                    Documents Vectorized: ${result.documents_vectorized}<br>
                    Chunks Created: ${result.total_chunks}<br>
                    Status: [COMPLETE]
                `;
                document.getElementById('vectorizationDetails').innerHTML = details;
                showAlert('Vectorization completed successfully!', 'success');
            } else if (result.status === 'skipped') {
                document.getElementById('vectorizationDetails').innerHTML = `
                    Status: Skipped<br>
                    Reason: Collection already vectorized
                `;
                showAlert('Collection already vectorized', 'info');
            }
            
            // Refresh collection list and stats
            loadCollectionsForVectorization();
            loadCurrentDbStats();
        }, 2000);
        
    } catch (error) {
        addMessage(`Error: ${error.message}`, 'error');
        progressText.textContent = 'Vectorization failed';
        showAlert(`Vectorization failed: ${error.message}`, 'error');
        
        setTimeout(() => {
            progressDiv.classList.add('hidden');
        }, 3000);
    }
}

// Keep the old function for non-streaming fallback
async function startVectorizationFallback() {
    const dbKey = document.getElementById('vectorizeDbSelect').value;
    const collectionName = document.getElementById('vectorizeCollectionSelect').value;
    const textFieldsInput = document.getElementById('textFieldsInput').value;
    const chunkSize = parseInt(document.getElementById('chunkSizeInput').value);
    
    if (!collectionName) {
        showAlert('Please select a collection to vectorize', 'error');
        return;
    }
    
    if (!textFieldsInput.trim()) {
        showAlert('Please specify text fields to vectorize', 'error');
        return;
    }
    
    const textFields = textFieldsInput.split(',').map(f => f.trim()).filter(f => f);
    
    if (textFields.length === 0) {
        showAlert('Please specify at least one text field', 'error');
        return;
    }
    
    // Show progress
    document.getElementById('vectorizationProgress').classList.remove('hidden');
    document.getElementById('vectorizationResult').classList.add('hidden');
    document.getElementById('vectorizationStatus').textContent = 'Starting vectorization...';
    
    try {
        showAlert('Starting vectorization process...', 'info');
        
        const result = await API.smartVectorize(dbKey, collectionName, textFields, chunkSize);
        
        // Hide progress, show result
        document.getElementById('vectorizationProgress').classList.add('hidden');
        document.getElementById('vectorizationResult').classList.remove('hidden');
        
        if (result.status === 'success') {
            const details = `
                Collection: ${result.collection}<br>
                Documents Vectorized: ${result.documents_vectorized}<br>
                Chunks Created: ${result.chunks_created}<br>
                Time: ${result.processing_time?.toFixed(2) || 'N/A'}s<br>
                Vectors in Database: ${result.total_vectors || 'N/A'}
            `;
            document.getElementById('vectorizationDetails').innerHTML = details;
            showAlert('Vectorization completed successfully!', 'success');
            
            // Refresh collection list to show updated vectorization status
            await loadCollectionsForVectorization();
            
            // Refresh database stats
            await loadCurrentDbStats();
        } else if (result.status === 'skipped') {
            document.getElementById('vectorizationDetails').innerHTML = `
                Status: Skipped<br>
                Reason: ${result.reason}<br>
                Message: ${result.message}
            `;
            showAlert(result.message, 'info');
        } else {
            throw new Error(result.error || 'Unknown error');
        }
        
    } catch (error) {
        document.getElementById('vectorizationProgress').classList.add('hidden');
        console.error('Vectorization failed:', error);
        showAlert(`Vectorization failed: ${error.message}`, 'error');
    }
}

async function vectorizeAllInCurrentDb() {
    const dbKey = AppState.currentDatabase;
    const db = AppState.databases.find(d => d.key === dbKey);
    
    if (!db) {
        showAlert('No database selected', 'error');
        return;
    }
    
    const message = `Vectorize all collections in "${db.name}" (${dbKey})?\n\n` +
                    `This will:\n` +
                    `[OK] Auto-detect text fields in each collection\n` +
                    `[OK] Skip already vectorized collections\n` +
                    `[OK] Create AI embeddings for semantic search\n\n` +
                    `This may take some time depending on data size.`;
    
    if (!confirm(message)) {
        return;
    }
    
    // Use the backend's sync-all endpoint with auto-detection
    await useSyncAllEndpoint(dbKey, db.name);
}

async function useSyncAllEndpoint(dbKey, dbName) {
    try {
        // Create a progress display area
        const progressDiv = document.createElement('div');
        progressDiv.id = 'vectorization-progress';
        progressDiv.className = 'card';
        progressDiv.style.marginTop = '1rem';
        progressDiv.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">Vectorizing ${dbName}</h3>
            </div>
            <div id="progress-content" style="padding: 1rem;">
                <div id="progress-messages" style="max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 0.875rem; background: var(--background); padding: 1rem; border-radius: 4px;">
                    <div>[PROCESSING] Initializing vectorization...</div>
                </div>
                <div class="progress-container" style="margin-top: 1rem;">
                    <div id="progress-bar" class="progress-bar" style="width: 0%"></div>
                </div>
                <div id="progress-text" class="progress-text" style="margin-top: 0.5rem;">Starting...</div>
            </div>
        `;
        
        const content = document.getElementById('app-content');
        content.insertBefore(progressDiv, content.firstChild);
        
        const messagesDiv = document.getElementById('progress-messages');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        const addMessage = (msg, type = 'info') => {
            const icon = type === 'success' ? '[OK]' : type === 'error' ? '[ERROR]' : type === 'skip' ? '[SKIP]' : '[...]';
            const color = type === 'success' ? 'var(--accent-color)' : type === 'error' ? 'var(--error-color)' : 'var(--text-secondary)';
            const line = document.createElement('div');
            line.style.color = color;
            line.textContent = `${icon} ${msg}`;
            messagesDiv.appendChild(line);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        };
        
        const response = await fetch(`${API_BASE_URL}/vectorize/sync-all`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                db_keys: [dbKey],
                auto_detect_fields: true,
                force: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Clear progress messages and show results
        messagesDiv.innerHTML = '';
        
        // Show details for each collection
        result.sync_results.forEach(r => {
            if (r.status === 'success') {
                addMessage(`${r.collection}: ${r.documents_vectorized} docs, ${r.total_chunks} chunks`, 'success');
            } else if (r.status === 'skipped') {
                addMessage(`${r.collection}: ${r.reason}`, 'skip');
            } else if (r.status === 'error') {
                addMessage(`${r.collection}: ${r.error}`, 'error');
            }
        });
        
        // Update progress bar to 100%
        progressBar.style.width = '100%';
        progressText.textContent = `Complete: ${result.successful} successful, ${result.skipped} skipped, ${result.errors} errors`;
        
        // Show final summary
        const summary = `Vectorization complete for ${dbName}!\n` +
                        `Successfully vectorized: ${result.successful} | Skipped: ${result.skipped} | Errors: ${result.errors}`;
        showAlert(summary, result.successful > 0 ? 'success' : 'info');
        
        // Refresh stats
        await loadCurrentDbStats();
        await loadCollectionsForVectorization();
        
        // Remove progress div after 10 seconds
        setTimeout(() => {
            if (progressDiv && progressDiv.parentNode) {
                progressDiv.remove();
            }
        }, 10000);
        
    } catch (error) {
        console.error('Vectorization error:', error);
        showAlert(`Vectorization failed: ${error.message}`, 'error');
        
        // Remove progress div on error
        const progressDiv = document.getElementById('vectorization-progress');
        if (progressDiv) {
            progressDiv.remove();
        }
    }
}

async function vectorizeAllCollections(dbKey, dbName) {
    try {
        showAlert(`Starting vectorization for all collections in ${dbName}...`, 'info');
        
        // Get all collections
        const collections = await API.getCollections(dbKey);
        
        if (!collections.collections || collections.collections.length === 0) {
            showAlert('No collections found in this database', 'error');
            return;
        }
        
        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        for (const col of collections.collections) {
            try {
                if (col.vectorized) {
                    console.log(`Skipping ${col.name} - already vectorized`);
                    skippedCount++;
                    continue;
                }
                
                showAlert(`Vectorizing collection: ${col.name}...`, 'info');
                
                // Auto-detect text fields by fetching a sample document
                let textFields = [];
                try {
                    // Get collection schema to find text fields
                    const response = await fetch(`${API_BASE_URL}/databases/${dbKey}/collections`);
                    if (response.ok) {
                        const schemaData = await response.json();
                        // For now, use common field names, but backend will auto-detect
                        textFields = ['name', 'username', 'address', 'email', 'title', 'description', 'content', 'text', 'message', 'body', 'summary'];
                    }
                } catch (e) {
                    console.log('Using default text fields');
                    textFields = ['name', 'username', 'address', 'email', 'title', 'description', 'content', 'text', 'message', 'body', 'summary'];
                }
                
                const result = await API.smartVectorize(dbKey, col.name, textFields, 500);
                
                if (result.status === 'success') {
                    console.log(`✓ Vectorized ${col.name}: ${result.chunks_created} chunks`);
                    successCount++;
                } else if (result.status === 'skipped') {
                    console.log(`⊘ Skipped ${col.name}: ${result.reason}`);
                    skippedCount++;
                } else {
                    console.error(`✗ Failed ${col.name}: ${result.error}`);
                    errorCount++;
                }
                
                // Small delay between collections
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`Error vectorizing ${col.name}:`, error);
                errorCount++;
            }
        }
        
        // Show summary
        const summary = `
            Vectorization Complete for ${dbName}!
            
            ✓ Successfully vectorized: ${successCount}
            ⊘ Skipped: ${skippedCount}
            ✗ Errors: ${errorCount}
            Total: ${collections.collections.length}
        `;
        
        showAlert(summary, successCount > 0 ? 'success' : 'info');
        
        // Refresh stats
        await loadCurrentDbStats();
        await loadCollectionsForVectorization();
        
    } catch (error) {
        console.error('Failed to vectorize collections:', error);
        showAlert(`Failed to vectorize collections: ${error.message}`, 'error');
    }
}

async function deleteAllEmbeddings() {
    const dbKey = AppState.currentDatabase;
    const dbName = AppState.databases.find(d => d.key === dbKey)?.name || dbKey;
    
    // Confirm deletion
    const confirmed = confirm(
        `⚠️ WARNING: Delete All Vector Embeddings?\n\n` +
        `This will permanently delete ALL vector embeddings for:\n` +
        `Database: ${dbName} (${dbKey})\n\n` +
        `This action cannot be undone!\n\n` +
        `You will need to re-vectorize collections to use semantic search again.\n\n` +
        `Are you sure you want to continue?`
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        showAlert('Deleting all vector embeddings...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/vectors/clear?db_key=${dbKey}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        showAlert(
            `✓ Successfully deleted ${result.total_deleted || result.deleted_count || 0} vector embeddings from ${result.collections_cleared || 'all collections'} in ${dbName}`,
            'success'
        );
        
        // Refresh stats and collection list
        await loadCurrentDbStats();
        await loadCollectionsForVectorization();
        
    } catch (error) {
        console.error('Error deleting embeddings:', error);
        showAlert(`Error deleting embeddings: ${error.message}`, 'error');
    }
}