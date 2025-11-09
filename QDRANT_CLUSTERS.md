# Qdrant Multi-Cluster Architecture

## Overview
The system now uses **separate Qdrant collections for each MongoDB database**, providing better isolation, performance, and management capabilities.

## Architecture Changes

### Before (Single Collection)
```
┌─────────────────────────────────────┐
│   Qdrant: synapse_vectors           │
│                                     │
│   ├─ DB: primary                   │
│   │   ├─ customers (vectors)       │
│   │   ├─ transactions (vectors)    │
│   │   └─ accounts (vectors)        │
│   │                                 │
│   ├─ DB: test                      │
│   │   ├─ users (vectors)           │
│   │   └─ orders (vectors)          │
│   │                                 │
│   └─ DB: test1                     │
│       └─ products (vectors)         │
└─────────────────────────────────────┘
```

### After (Multi-Cluster)
```
┌─────────────────────────────────────┐
│   Qdrant: synapse_primary           │
│   ├─ customers (vectors)            │
│   ├─ transactions (vectors)         │
│   └─ accounts (vectors)             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Qdrant: synapse_test              │
│   ├─ users (vectors)                │
│   └─ orders (vectors)               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   Qdrant: synapse_test1             │
│   └─ products (vectors)             │
└─────────────────────────────────────┘
```

## Configuration File: `qdrant_clusters.json`

### Structure
```json
{
  "clusters": {
    "primary": {
      "collection_name": "synapse_primary",
      "created_at": "2025-11-09T00:00:00",
      "dimension": 384,
      "vector_count": 0,
      "description": "Primary database Qdrant collection"
    },
    "test": {
      "collection_name": "synapse_test",
      "created_at": "2025-11-09T00:00:00",
      "dimension": 384,
      "vector_count": 0,
      "description": "Test database Qdrant collection"
    }
  },
  "metadata": {
    "last_updated": "2025-11-09T00:00:00",
    "version": "1.0",
    "total_clusters": 2
  }
}
```

## Key Functions

### 1. `get_qdrant_collection_for_db(db_key: str) -> str`
Returns the Qdrant collection name for a specific database.
- Automatically creates cluster mapping if database is new
- Updates `qdrant_clusters.json` with new entries

### 2. `initialize_qdrant_collection_for_db(db_key: str, collection_name: str)`
Creates a Qdrant collection for a specific database with:
- 384-dimensional vectors (MiniLM-L6-v2)
- COSINE distance metric
- HNSW indexing
- Payload indexes for: `db_key`, `source_collection`, `source_doc_id`, `created_at`

### 3. `initialize_qdrant_collection()`
Initializes Qdrant collections for ALL databases on startup.

## API Endpoints

### New Endpoint: `GET /qdrant/clusters`
Returns detailed information about all Qdrant clusters:
```json
{
  "clusters": {
    "primary": {
      "collection_name": "synapse_primary",
      "vector_count": 1234,
      "exists": true,
      "status": "green",
      "dimension": 384
    }
  }
}
```

### Updated: `DELETE /vectors/clear?db_key={db_key}`
Now performs complete cluster deletion:
1. Deletes entire Qdrant collection for the database
2. Recreates empty collection with same configuration
3. Clears vector state for all MongoDB collections
4. Returns count of deleted vectors

**Response:**
```json
{
  "status": "cleared",
  "db_key": "primary",
  "qdrant_collection": "synapse_primary",
  "collections_cleared": 4,
  "total_deleted": 1234
}
```

### Updated: `GET /vectors/stats`
Now reports statistics across all clusters:
```json
{
  "total_vectors": 5000,
  "vector_dimension": 384,
  "distance_metric": "COSINE",
  "qdrant_clusters": 3,
  "database_summary": [
    {
      "db_key": "primary",
      "db_name": "Cluster0",
      "qdrant_collection": "synapse_primary",
      "total_vectors": 3000
    }
  ]
}
```

## Benefits

### 1. **Better Isolation**
- Each database has its own vector space
- No cross-contamination between databases
- Easier to manage permissions in production

### 2. **Improved Performance**
- Smaller collections = faster searches
- Better HNSW index efficiency
- Reduced scroll/filter overhead

### 3. **Easier Management**
- Delete all vectors for a database with one operation
- Clear understanding of which vectors belong to which DB
- Better monitoring and debugging

### 4. **Scalability**
- Add new databases without affecting existing collections
- Each cluster can be optimized independently
- Better resource allocation in Qdrant Cloud

### 5. **Data Sovereignty**
- Future: Can route databases to different Qdrant clusters/regions
- Better compliance with data residency requirements

## Migration Path

### Automatic Migration
The system automatically handles migration:
1. On startup, checks for existing collections
2. Creates new database-specific collections
3. Old `synapse_vectors` collection can be manually deleted after verification

### Manual Verification
```bash
# Check cluster configuration
curl http://localhost:8000/qdrant/clusters

# Check vector statistics
curl http://localhost:8000/vectors/stats

# Verify specific database vectors
curl http://localhost:8000/vectors/stats | jq '.database_summary'
```

## Usage Examples

### Vectorize a Database
```javascript
// Frontend: upload.js - vectorizeAllInCurrentDb()
// Now automatically uses correct Qdrant collection
POST /vectorize/sync-all
{
  "db_keys": ["primary"],
  "auto_detect_fields": true
}
```

### Clear Database Vectors
```javascript
// Frontend: upload.js - deleteAllEmbeddings()
DELETE /vectors/clear?db_key=primary
// Deletes entire synapse_primary collection
// Recreates empty collection
```

### Query Vectors
```javascript
// Frontend: query.js - processQueryWithAPI()
POST /query/vector-rag
{
  "query": "Find customer transactions",
  "db_key": "primary"
}
// Searches only in synapse_primary collection
```

## Troubleshooting

### Check if Collections Exist
```python
# In Python/backend
collections = qdrant_client.get_collections()
for c in collections.collections:
    print(f"Collection: {c.name}, Vectors: {c.points_count}")
```

### Recreate a Collection
```bash
# Delete and recreate
curl -X DELETE "http://localhost:8000/vectors/clear?db_key=primary"
```

### View Cluster Configuration
```bash
# Check qdrant_clusters.json
cat qdrant_clusters.json
```

## Future Enhancements

1. **Multi-Region Support**: Route databases to different Qdrant clusters/regions
2. **Collection Snapshots**: Backup/restore specific database vectors
3. **Collection Sharing**: Share vectors between databases with permission control
4. **Auto-Scaling**: Create new collections when vector count exceeds threshold
5. **Collection Archival**: Move old vectors to cheaper storage tiers

## Files Modified

- `main.py`: Added cluster management functions, updated all Qdrant operations
- `qdrant_clusters.json`: New configuration file for cluster mappings
- `upload.js`: Updated deleteAllEmbeddings() to inform user about cluster deletion

## Testing Checklist

- [x] Create new database → auto-creates Qdrant collection
- [x] Vectorize collection → stores in correct cluster
- [x] Clear vectors → deletes from correct cluster
- [x] Query vectors → searches correct cluster
- [x] View stats → shows all clusters
- [x] Switch database → uses correct cluster
- [ ] Delete database → cleanup cluster (TODO)
- [ ] Migrate existing vectors → manual process (TODO)
