// js/app.js - Main Application Controller

const AppState = {
    currentPage: 'dashboard',
    uploadedFile: null,
    schema: null,
    queryResults: [],
    queryHistory: [],
    currentChart: null,
    availableCollections: [],
    currentCollection: null,
    apiConnected: false,
    databases: [],
    currentDatabase: 'primary',
    selectedDatabase: 'primary',  // Database selected for querying
    vectorStats: null,
    quotaStats: null,
    chartData: null  // Chart configuration from backend
};

function navigateTo(page) {
    AppState.currentPage = page;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'upload': 'Upload Database',
        'query': 'Query',
        'results': 'Results',
        'export': 'Export',
        'settings': 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
    
    // Render page
    renderPage(page);
    
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('active');
}

function renderPage(page) {
    const content = document.getElementById('app-content');
    
    switch(page) {
        case 'dashboard':
            content.innerHTML = DashboardPage();
            // Hide loading immediately after render - data is already loaded
            setTimeout(() => hideDashboardLoading(), 100);
            break;
        case 'upload':
            content.innerHTML = UploadPage();
            initializeUploadPage();
            break;
        case 'query':
            content.innerHTML = QueryPage();
            initializeQueryPage();
            break;
        case 'results':
            content.innerHTML = ResultsPage();
            initializeResultsPage();
            break;
        case 'export':
            content.innerHTML = ExportPage();
            break;
        case 'settings':
            content.innerHTML = SettingsPage();
            break;
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    console.log('Toggle sidebar called');
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
    console.log('Sidebar collapsed:', sidebar.classList.contains('collapsed'));
}

// Toggle mobile menu
document.addEventListener('DOMContentLoaded', async () => {
    const menuToggle = document.getElementById('menuToggle');
    
    console.log('Menu toggle element:', menuToggle);
    
    // Menu toggle controls the sidebar
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            console.log('Menu toggle clicked');
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
        });
    }
    
    // Initialize API connection
    AppState.apiConnected = await initializeAPIConnection();
    
    // Initialize sample schema for demo if API not connected
    if (!AppState.apiConnected) {
        initializeSampleSchema();
    } else {
        // Load schema from available collections
        await loadSchemaFromAPI();
    }
    
    // Initialize app
    navigateTo('dashboard');
});

// Load schema from API collections
async function loadSchemaFromAPI() {
    try {
        const dbKey = AppState.currentDatabase || 'primary';
        const collections = await API.getCollections(dbKey);
        AppState.availableCollections = collections.collections || [];
        
        if (AppState.availableCollections.length > 0) {
            // Map collections to schema format
            const schemas = AppState.availableCollections.map(col => ({
                name: col.name,
                columns: [], // Will be populated if needed
                records: col.document_count || 0,
                vectorized: col.vectorized || false,
                vector_count: col.vector_count || 0
            }));
            
            AppState.schema = schemas;
            AppState.currentCollection = schemas[0].name;
            
            // Update dashboard stats if elements exist
            if (document.getElementById('dashboardStatCollections')) {
                const totalCollections = collections.collections.length;
                const totalDocs = collections.collections.reduce((sum, col) => sum + col.document_count, 0);
                const vectorized = collections.collections.filter(col => col.vectorized).length;
                
                document.getElementById('dashboardStatCollections').textContent = totalCollections;
                document.getElementById('dashboardStatDocuments').textContent = totalDocs.toLocaleString();
                document.getElementById('dashboardStatVectorized').textContent = `${vectorized}/${totalCollections}`;
            }
        }
    } catch (error) {
        console.error('Error loading schema from API:', error);
    }
}

function showAlert(message, type = 'info') {
    const alertClass = `alert-${type}`;
    const content = document.getElementById('app-content');
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
    alert.textContent = message;
    content.insertBefore(alert, content.firstChild);
    
    setTimeout(() => alert.remove(), 5000);
}

function generateSampleData() {
    return {
        tables: [
            {
                name: 'sales',
                columns: ['id', 'product_id', 'customer_id', 'amount', 'quantity', 'date', 'status', 'payment_method'],
                records: 1547
            },
            {
                name: 'customers',
                columns: ['id', 'name', 'email', 'phone', 'address', 'city', 'country', 'created_date'],
                records: 423
            },
            {
                name: 'products',
                columns: ['id', 'name', 'description', 'category', 'price', 'stock_quantity', 'supplier_id'],
                records: 89
            },
            {
                name: 'orders',
                columns: ['id', 'customer_id', 'order_date', 'total_amount', 'status', 'shipping_address'],
                records: 892
            },
            {
                name: 'suppliers',
                columns: ['id', 'company_name', 'contact_name', 'email', 'phone', 'country'],
                records: 34
            }
        ],
        sampleResults: [
            { product: 'Laptop', amount: 1200, date: '2024-01-15', customer: 'John Doe' },
            { product: 'Mouse', amount: 25, date: '2024-01-16', customer: 'Jane Smith' },
            { product: 'Keyboard', amount: 75, date: '2024-01-17', customer: 'Bob Johnson' },
            { product: 'Monitor', amount: 350, date: '2024-01-18', customer: 'Alice Williams' },
            { product: 'Headphones', amount: 150, date: '2024-01-19', customer: 'Charlie Brown' }
        ]
    };
}

// Hide dashboard loading overlay
function hideDashboardLoading() {
    const overlay = document.getElementById('dashboardLoadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Show dashboard loading overlay
function showDashboardLoading() {
    const overlay = document.getElementById('dashboardLoadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.classList.remove('hidden');
        }, 10);
    }
}

// Initialize with sample schema for demo purposes
function initializeSampleSchema() {
    if (!AppState.schema) {
        const sampleData = generateSampleData();
        AppState.schema = sampleData.tables;
    }
}