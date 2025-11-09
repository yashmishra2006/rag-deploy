// js/api.js - API Configuration and Helper Functions

const API_BASE_URL = 'http://localhost:8000';
const USER_ID = 'default_user';

// API Helper Functions
const API = {
    async get(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },

    async delete(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API DELETE Error:', error);
            throw error;
        }
    },

    async post(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    },

    async uploadFile(endpoint, file, additionalData = {}) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Add additional data as query params
            const queryParams = new URLSearchParams(additionalData).toString();
            const url = `${API_BASE_URL}${endpoint}${queryParams ? '?' + queryParams : ''}`;
            
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Upload Error:', error);
            throw error;
        }
    },

    // Health check
    async checkHealth() {
        return await this.get('/health');
    },

    // Database Management
    async getDatabases() {
        return await this.get('/databases');
    },

    async getCollections(dbKey = 'primary') {
        return await this.get(`/databases/${dbKey}/collections`);
    },

    async addDatabase(dbKey, dbName, uri, description = '') {
        return await this.post('/databases/add', {
            key: dbKey,
            name: dbName,
            uri: uri,
            description: description
        });
    },

    async removeDatabase(dbKey) {
        return await this.delete(`/databases/${dbKey}`);
    },

    async analyzeSchema(collectionName) {
        return await this.post('/schema/analyze', { collection_name: collectionName });
    },

    // Queries
    async naturalLanguageQuery(query, userId = USER_ID) {
        return await this.post('/query/natural', {
            query: query,
            user_id: userId,
            tone: 'neutral'
        });
    },

    // Vector/RAG Queries
    async vectorRagQuery(query, dbKey = 'primary', collectionName = null, topK = 20) {
        return await this.post('/query/vector-rag', {
            query: query,
            db_key: dbKey,
            collection_name: collectionName,
            top_k: topK,
            use_vector_search: true
        });
    },

    async hybridSearch(query, dbKey = 'primary', filters = {}, topK = 10) {
        return await this.post('/query/hybrid-search', {
            query: query,
            db_key: dbKey,
            filters: filters,
            top_k: topK
        });
    },

    // Dashboard
    async generateDashboard(prompt, userId = USER_ID) {
        return await this.post('/dashboard/generate', {
            prompt: prompt,
            user_id: userId
        });
    },

    async getDashboard(dashboardId) {
        return await this.get(`/dashboard/${dashboardId}`);
    },

    // What-If Simulation
    async runSimulation(scenario, parameters, userId = USER_ID) {
        return await this.post('/whatif/simulate', {
            scenario: scenario,
            parameters: parameters,
            user_id: userId
        });
    },

    // Anomaly Detection
    async detectAnomalies(collectionName) {
        return await this.post(`/anomaly/detect?collection_name=${collectionName}`);
    },

    // File Upload
    async uploadCSV(file, dbKey = 'primary', collectionName = 'uploaded_data', autoVectorize = false) {
        return await this.uploadFile('/upload/csv', file, { 
            db_key: dbKey,
            collection_name: collectionName,
            auto_vectorize: autoVectorize
        });
    },

    async uploadJSON(file, dbKey = 'primary', collectionName = 'uploaded_data', autoVectorize = false) {
        return await this.uploadFile('/upload/json', file, { 
            db_key: dbKey,
            collection_name: collectionName,
            auto_vectorize: autoVectorize
        });
    },

    // Vectorization
    async smartVectorize(dbKey, collectionName, textFields, chunkSize = 500) {
        return await this.post('/vectorize/smart', {
            db_key: dbKey,
            collection_name: collectionName,
            text_fields: textFields,
            chunk_size: chunkSize,
            overlap: 50,
            batch_size: 100,
            force: false
        });
    },

    async smartVectorizeStream(dbKey, collectionName, textFields, chunkSize = 500, onProgress = null) {
        try {
            const response = await fetch(`${API_BASE_URL}/vectorize/smart/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    db_key: dbKey,
                    collection_name: collectionName,
                    text_fields: textFields,
                    chunk_size: chunkSize,
                    overlap: 50,
                    batch_size: 100,
                    force: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // Keep the last incomplete line in the buffer
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        if (onProgress) {
                            onProgress(data);
                        }
                        
                        // Return final result when complete
                        if (data.stage === 'complete') {
                            return data;
                        }
                        
                        // Throw error if encountered
                        if (data.error) {
                            throw new Error(data.error);
                        }
                    }
                }
            }

            return { status: 'success' };
        } catch (error) {
            console.error('Streaming Vectorization Error:', error);
            throw error;
        }
    },

    async checkVectorizationStatus(dbKey = null, collectionName = null) {
        return await this.post('/vectorize/check', {
            db_key: dbKey,
            collection_name: collectionName
        });
    },

    async syncAllVectors(dbKeys = null, autoDetectFields = true, force = false) {
        return await this.post('/vectorize/sync-all', {
            db_keys: dbKeys,
            auto_detect_fields: autoDetectFields,
            force: force
        });
    },

    async clearVectors(dbKey = null, collectionName = null) {
        return await this.delete(`/vectors/clear?${new URLSearchParams({ 
            db_key: dbKey || '', 
            collection_name: collectionName || '' 
        }).toString()}`);
    },

    async getVectorStats() {
        return await this.get('/vectors/stats');
    },

    // Quota & Cache
    async getQuotaStats() {
        return await this.get('/quota/stats');
    },

    async getCacheStats() {
        return await this.get('/cache/stats');
    },

    // Memory/History
    async getUserMemory(userId = USER_ID) {
        return await this.get(`/memory/${userId}`);
    },

    async storeMemory(context, metadata = {}, userId = USER_ID) {
        return await this.post('/memory/store', {
            user_id: userId,
            context: context,
            metadata: metadata
        });
    },

    // Export
    async exportToExcel(data) {
        try {
            const response = await fetch(`${API_BASE_URL}/export/excel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'export.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            return { status: 'success' };
        } catch (error) {
            console.error('Export Error:', error);
            throw error;
        }
    }
};

// Initialize API connection check
async function initializeAPIConnection() {
    try {
        const health = await API.checkHealth();
        console.log('✅ API Connection Status:', health);
        
        if (health.status === 'healthy') {
            // Load databases
            const databases = await API.getDatabases();
            AppState.databases = databases.databases || [];
            console.log('📊 Available Databases:', AppState.databases);
            
            // Load collections from primary database
            const collections = await API.getCollections('primary');
            AppState.availableCollections = collections.collections || [];
            AppState.currentDatabase = 'primary';
            console.log('📁 Collections in primary DB:', AppState.availableCollections);
            
            // Get vector stats
            try {
                const vectorStats = await API.getVectorStats();
                console.log('🧠 Vector Stats:', vectorStats);
                AppState.vectorStats = vectorStats;
            } catch (e) {
                console.log('ℹ️ Vector embeddings not initialized yet');
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to connect to API:', error);
        showAlert('Failed to connect to backend server. Please ensure the server is running on http://localhost:8000', 'error');
        return false;
    }
}
