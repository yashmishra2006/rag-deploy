# 🧪 Testing Guide - Frontend & Backend Integration

## Quick Test Checklist

### ✅ **Step 1: Start Backend**
```bash
cd c:\Users\yash4\Desktop\rag-deploy
python main.py
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════╗
║     Synapse DB API - Multi-Database Edition          ║
╚═══════════════════════════════════════════════════════╝
✓ Collection 'synapse_vectors' already exists
✓ Synapse DB API started with 1 database(s)
  - primary: Cluster0
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### ✅ **Step 2: Test Backend Health**

Open browser: http://localhost:8000/docs

Try these endpoints in Swagger UI:

1. **GET /health** - Click "Try it out" → Execute
   - Should show: `"status": "healthy"`

2. **GET /databases** - Execute
   - Should list your databases

3. **GET /databases/primary/collections** 
   - `db_key`: `primary`
   - Execute
   - Should list all collections

### ✅ **Step 3: Start Frontend**

**Option A: VS Code Live Server**
- Right-click `index.html`
- Select "Open with Live Server"
- Opens at http://localhost:5500

**Option B: Python Server**
```bash
cd c:\Users\yash4\Desktop\rag-deploy
python -m http.server 5500
```

### ✅ **Step 4: Test Frontend Connection**

1. Open http://localhost:5500
2. Open browser console (F12)
3. Look for these messages:
   ```
   ✅ API Connection Status: {status: "healthy", ...}
   📊 Available Databases: [{key: "primary", ...}]
   📁 Collections in primary DB: [...]
   🧠 Vector Stats: {...}
   ```

### ✅ **Step 5: Test Visual Schema**

1. Click "Dashboard" in sidebar
2. Should see your database tables
3. **Hover** over a table → Should expand showing columns
4. **Move away** → Should collapse
5. **Click** a table → Should lock it open
6. Look for relationship lines connecting tables

### ✅ **Step 6: Test Upload**

1. Click "Upload Database"
2. Create a test CSV:
   ```csv
   name,email,age,city
   John Doe,john@example.com,30,New York
   Jane Smith,jane@example.com,25,Los Angeles
   Bob Wilson,bob@example.com,35,Chicago
   ```
3. Save as `test_users.csv`
4. Select file
5. Collection name: `test_users`
6. Check "Auto-Vectorize" (optional)
7. Click Upload
8. Should see success message

### ✅ **Step 7: Test Query (Traditional)**

1. Click "Query"
2. Enter: `show me all users`
3. Click "Execute Query"
4. Should navigate to Results page
5. Should see data table

### ✅ **Step 8: Test Vector Search (If Vectorized)**

**First, vectorize a collection:**

In Swagger UI (http://localhost:8000/docs):

1. **POST /vectorize/smart**
   - Request body:
   ```json
   {
     "db_key": "primary",
     "collection_name": "test_users",
     "text_fields": ["name", "email", "city"],
     "chunk_size": 500
   }
   ```
   - Execute
   - Wait for completion

2. Check status:
   - **GET /vectors/stats**
   - Should show vectors created

**Then test in frontend:**

1. In Query page, enter: `find users from New York`
2. Enable "Use Vector Search"
3. Click Execute
4. Should get AI-generated answer with sources

### ✅ **Step 9: Test Export**

1. Click "Export"
2. Select database: `primary`
3. Select collection: `test_users`
4. Click "Export as CSV" or "Export as JSON"
5. Should download file

---

## 🐛 Troubleshooting

### **Frontend shows "Failed to connect to backend"**
- ✓ Check backend is running: http://localhost:8000/health
- ✓ Check CORS is enabled in main.py
- ✓ Check API_BASE_URL in api.js is `http://localhost:8000`

### **Backend shows "Database objects do not implement truth value"**
- ✓ Fixed! We changed `if not db_instance:` to `if db_instance is None:`

### **Charts not displaying**
- ✓ Check Chart.js is loaded in index.html
- ✓ Check browser console for errors
- ✓ Verify queryResults has data

### **Visual schema not showing tables**
- ✓ Check collections are loaded in AppState
- ✓ Check schema has data
- ✓ Open console and check for errors

### **Vector search returns "No vectors found"**
- ✓ Run vectorization first: POST /vectorize/smart
- ✓ Check Qdrant connection in /health
- ✓ Check /vectors/stats shows vectors

---

## 📊 Testing Vector Features

### **1. Check Vectorization Status**

Swagger UI: **POST /vectorize/check**
```json
{
  "db_key": "primary",
  "collection_name": null
}
```

Response shows which collections need vectorization.

### **2. Vectorize a Collection**

Swagger UI: **POST /vectorize/smart**
```json
{
  "db_key": "primary",
  "collection_name": "users",
  "text_fields": ["name", "bio", "description"],
  "chunk_size": 500,
  "force": false
}
```

### **3. Test Vector Search**

Swagger UI: **POST /query/vector-rag**
```json
{
  "query": "find active developers",
  "db_key": "primary",
  "top_k": 5
}
```

### **4. Check Stats**

- **GET /vectors/stats** - Vector count, breakdown by collection
- **GET /quota/stats** - API usage
- **GET /cache/stats** - Cache hit rate

---

## 🎯 Full Integration Test

**Complete workflow test:**

```
1. Start backend → http://localhost:8000
2. Start frontend → http://localhost:5500
3. Check health → Green status
4. Upload test CSV → Success
5. Vectorize collection → Vectors created
6. Query with AI → Get answer
7. View results → See chart
8. Export data → Download file
```

**All working?** ✅ **Your system is fully integrated!** 🚀

---

## 📝 API Testing with curl

### Test health:
```bash
curl http://localhost:8000/health
```

### List collections:
```bash
curl http://localhost:8000/databases/primary/collections
```

### Upload CSV:
```bash
curl -X POST "http://localhost:8000/upload/csv?db_key=primary&collection_name=test" \
  -F "file=@test.csv"
```

### Vector search:
```bash
curl -X POST http://localhost:8000/query/vector-rag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "find users interested in AI",
    "db_key": "primary",
    "top_k": 5
  }'
```

---

## ✨ Success Indicators

✅ Backend running without errors
✅ Frontend loads and shows dashboard
✅ Console shows successful API connection
✅ Collections appear in visual schema
✅ Queries execute and return results
✅ Charts render properly
✅ Upload works and saves to database
✅ Export downloads files correctly
✅ Vector search returns AI-generated answers

**All green?** Your system is production-ready! 🎉
