"""
ENHANCED Synapse DB API with Multi-Database Support & Smart Vectorization
- Multiple MongoDB databases simultaneously
- Smart vectorization with duplicate prevention
- Automatic vector lifecycle management
- Qdrant Cloud for vector embeddings
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import motor.motor_asyncio
import google.generativeai as genai
from datetime import datetime
import json
import io
import pandas as pd
from bson import ObjectId
import re
import uuid
import hashlib
from collections import defaultdict
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Sentence Transformers for embeddings
from sentence_transformers import SentenceTransformer

# Qdrant imports
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue, Range,
    HnswConfigDiff, OptimizersConfigDiff
)

# Initialize FastAPI
app = FastAPI(title="Synapse DB API - Enhanced Multi-DB Edition", version="5.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= CONFIGURATION =============
# Load from environment variables
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION_NAME = "synapse_vectors"
QDRANT_TIMEOUT = 120

# Gemini Configuration (for LLM only)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Validate required environment variables
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")
if not QDRANT_URL:
    raise ValueError("QDRANT_URL not found in environment variables")
if not QDRANT_API_KEY:
    raise ValueError("QDRANT_API_KEY not found in environment variables")

# Sentence Transformers Configuration
EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2'
EMBEDDING_DIMENSION = 384  # MiniLM L6 produces 384-dimensional embeddings

# Database Connections File
DB_CONNECTIONS_FILE = "database_connections.json"
# Qdrant Clusters Configuration File
QDRANT_CLUSTERS_FILE = "qdrant_clusters.json"

# MongoDB Configuration - Load from file or use default
def load_database_connections():
    """Load database connections from JSON file"""
    import os
    if os.path.exists(DB_CONNECTIONS_FILE):
        try:
            with open(DB_CONNECTIONS_FILE, 'r') as f:
                data = json.load(f)
                return data.get("databases", {})
        except Exception as e:
            print(f"❌ Error loading database connections: {e}")
    
    # Default connection if file doesn't exist
    return {
        "primary": {
            "uri": "mongodb+srv://arkin:kansrarkin@cluster0.pzgo5g9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
            "name": "Cluster0",
            "description": "Primary database"
        }
    }

def save_database_connections(databases: Dict):
    """Save database connections to JSON file"""
    try:
        with open(DB_CONNECTIONS_FILE, 'w') as f:
            json.dump({"databases": databases}, f, indent=2)
        print(f"✓ Database connections saved to {DB_CONNECTIONS_FILE}")
        return True
    except Exception as e:
        print(f"❌ Error saving database connections: {e}")
        return False

# Load MongoDB databases from file
MONGO_DATABASES = load_database_connections()
print(f"✓ Loaded {len(MONGO_DATABASES)} database connection(s)")

# Qdrant Cluster Management
def load_qdrant_clusters():
    """Load Qdrant cluster assignments from JSON file"""
    import os
    if os.path.exists(QDRANT_CLUSTERS_FILE):
        try:
            with open(QDRANT_CLUSTERS_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading Qdrant clusters: {e}")
    
    # Default: create cluster mapping for existing databases
    clusters = {
        "clusters": {}
    }
    for db_key in MONGO_DATABASES.keys():
        clusters["clusters"][db_key] = {
            "collection_name": f"synapse_{db_key}",
            "created_at": datetime.now().isoformat(),
            "dimension": EMBEDDING_DIMENSION,
            "vector_count": 0
        }
    
    save_qdrant_clusters(clusters)
    return clusters

def save_qdrant_clusters(clusters: Dict):
    """Save Qdrant cluster assignments to JSON file"""
    try:
        with open(QDRANT_CLUSTERS_FILE, 'w') as f:
            json.dump(clusters, f, indent=2)
        return True
    except Exception as e:
        print(f"❌ Error saving Qdrant clusters: {e}")
        return False

def get_qdrant_collection_for_db(db_key: str) -> str:
    """Get the Qdrant collection name for a specific database"""
    clusters = load_qdrant_clusters()
    if db_key in clusters.get("clusters", {}):
        return clusters["clusters"][db_key]["collection_name"]
    else:
        # Create new cluster for this database
        collection_name = f"synapse_{db_key}"
        clusters["clusters"][db_key] = {
            "collection_name": collection_name,
            "created_at": datetime.now().isoformat(),
            "dimension": EMBEDDING_DIMENSION,
            "vector_count": 0
        }
        save_qdrant_clusters(clusters)
        return collection_name

# Load Qdrant clusters configuration
QDRANT_CLUSTERS = load_qdrant_clusters()
print(f"✓ Loaded Qdrant cluster configuration for {len(QDRANT_CLUSTERS.get('clusters', {}))} database(s)")

# Initialize Clients
genai.configure(api_key=GEMINI_API_KEY)
llm_model = genai.GenerativeModel('gemini-2.0-flash-lite')

# Initialize Sentence Transformer model for embeddings
print("Loading MiniLM-L6-v2 embedding model...")
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
print(f"✓ Embedding model loaded. Dimension: {EMBEDDING_DIMENSION}")

# MongoDB Clients - Multiple databases
mongo_clients = {}
databases = {}

for db_key, config in MONGO_DATABASES.items():
    mongo_clients[db_key] = motor.motor_asyncio.AsyncIOMotorClient(config["uri"])
    databases[db_key] = mongo_clients[db_key][config["name"]]

# Default database
db = databases["primary"]

# Qdrant Client
qdrant_client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    timeout=QDRANT_TIMEOUT,
    prefer_grpc=False
)

# ============= QUOTA OPTIMIZATION =============
class EmbeddingCache:
    """Cache embeddings to reduce API calls"""
    def __init__(self, max_size: int = 10000):
        self.cache = {}
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
    
    def get_key(self, text: str) -> str:
        """Generate cache key from text"""
        return hashlib.md5(text.encode()).hexdigest()
    
    def get(self, text: str) -> Optional[List[float]]:
        """Get cached embedding"""
        key = self.get_key(text)
        if key in self.cache:
            self.hits += 1
            return self.cache[key]
        self.misses += 1
        return None
    
    def set(self, text: str, embedding: List[float]):
        """Cache embedding"""
        if len(self.cache) >= self.max_size:
            # Remove oldest 20% entries
            remove_count = self.max_size // 5
            keys_to_remove = list(self.cache.keys())[:remove_count]
            for key in keys_to_remove:
                del self.cache[key]
        
        key = self.get_key(text)
        self.cache[key] = embedding
    
    def stats(self) -> Dict:
        """Get cache statistics"""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            "size": len(self.cache),
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.1f}%"
        }

embedding_cache = EmbeddingCache()

class QuotaManager:
    """Track and limit API usage"""
    def __init__(self):
        self.embedding_calls = 0
        self.llm_calls = 0
        self.start_time = datetime.utcnow()
        self.embedding_limit = 1000  # Per session
        self.llm_limit = 100  # Per session
    
    def can_embed(self) -> bool:
        """Check if embedding quota available"""
        return self.embedding_calls < self.embedding_limit
    
    def can_llm(self) -> bool:
        """Check if LLM quota available"""
        return self.llm_calls < self.llm_limit
    
    def track_embedding(self):
        """Track embedding call"""
        self.embedding_calls += 1
    
    def track_llm(self):
        """Track LLM call"""
        self.llm_calls += 1
    
    def stats(self) -> Dict:
        """Get quota statistics"""
        uptime = (datetime.utcnow() - self.start_time).total_seconds()
        return {
            "embedding_calls": self.embedding_calls,
            "embedding_remaining": self.embedding_limit - self.embedding_calls,
            "llm_calls": self.llm_calls,
            "llm_remaining": self.llm_limit - self.llm_calls,
            "uptime_seconds": int(uptime),
            "cache_stats": embedding_cache.stats()
        }
    
    def reset(self):
        """Reset counters"""
        self.embedding_calls = 0
        self.llm_calls = 0
        self.start_time = datetime.utcnow()

quota_manager = QuotaManager()

# ============= VECTORIZATION STATE MANAGEMENT =============
class VectorStateManager:
    """Manages vectorization state and prevents duplicates"""
    
    def __init__(self):
        self.state_collection = "vector_state"
    
    async def get_state(self, db_key: str, collection_name: str) -> Optional[Dict]:
        """Get vectorization state for a collection"""
        db_instance = databases.get(db_key)
        if db_instance is None:
            return None
        
        state = await db_instance[self.state_collection].find_one({
            "db_key": db_key,
            "collection_name": collection_name
        })
        return state
    
    async def set_state(
        self, 
        db_key: str, 
        collection_name: str, 
        document_count: int,
        vector_count: int,
        text_fields: List[str],
        chunk_size: int,
        content_hash: str
    ):
        """Update vectorization state"""
        db_instance = databases.get(db_key)
        if db_instance is None:
            return
        
        await db_instance[self.state_collection].update_one(
            {
                "db_key": db_key,
                "collection_name": collection_name
            },
            {
                "$set": {
                    "document_count": document_count,
                    "vector_count": vector_count,
                    "text_fields": text_fields,
                    "chunk_size": chunk_size,
                    "content_hash": content_hash,
                    "last_vectorized": datetime.utcnow(),
                    "status": "completed"
                }
            },
            upsert=True
        )
    
    async def compute_content_hash(self, db_key: str, collection_name: str) -> str:
        """Compute hash of collection content to detect changes"""
        db_instance = databases.get(db_key)
        if db_instance is None:
            return ""
        
        # Sample documents and compute hash
        docs = await db_instance[collection_name].find().limit(100).to_list(100)
        
        # Create hash from document IDs and update times
        hash_input = ""
        for doc in docs:
            doc_id = str(doc.get("_id", ""))
            update_time = str(doc.get("_upload_timestamp", doc.get("updated_at", "")))
            hash_input += doc_id + update_time
        
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    async def needs_vectorization(
        self, 
        db_key: str, 
        collection_name: str,
        force: bool = False
    ) -> Dict[str, Any]:
        """Check if collection needs (re)vectorization"""
        if force:
            return {
                "needs_vectorization": True,
                "reason": "forced",
                "action": "clear_and_revectorize"
            }
        
        # Get current state
        state = await self.get_state(db_key, collection_name)
        
        # Get current document count
        db_instance = databases.get(db_key)
        if db_instance is None:
            return {"needs_vectorization": False, "reason": "database_not_found"}
        
        current_count = await db_instance[collection_name].count_documents({})
        
        if current_count == 0:
            return {
                "needs_vectorization": False,
                "reason": "empty_collection"
            }
        
        # Never vectorized
        if not state:
            return {
                "needs_vectorization": True,
                "reason": "never_vectorized",
                "action": "vectorize"
            }
        
        # Check if content changed
        current_hash = await self.compute_content_hash(db_key, collection_name)
        
        if state.get("content_hash") != current_hash:
            return {
                "needs_vectorization": True,
                "reason": "content_changed",
                "action": "clear_and_revectorize",
                "previous_count": state.get("document_count", 0),
                "current_count": current_count
            }
        
        # Check if new documents added
        if current_count > state.get("document_count", 0):
            return {
                "needs_vectorization": True,
                "reason": "new_documents",
                "action": "append_vectors",
                "previous_count": state.get("document_count", 0),
                "current_count": current_count,
                "new_documents": current_count - state.get("document_count", 0)
            }
        
        # Already up to date
        return {
            "needs_vectorization": False,
            "reason": "up_to_date",
            "last_vectorized": state.get("last_vectorized"),
            "vector_count": state.get("vector_count", 0)
        }
    
    async def clear_state(self, db_key: str, collection_name: str):
        """Clear vectorization state"""
        db_instance = databases.get(db_key)
        if db_instance is not None:
            await db_instance[self.state_collection].delete_one({
                "db_key": db_key,
                "collection_name": collection_name
            })

vector_state_manager = VectorStateManager()

# ============= PYDANTIC MODELS =============
class DatabaseInfo(BaseModel):
    key: str
    name: str
    uri: str
    description: Optional[str] = None

class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = "default_user"
    db_key: Optional[str] = "primary"
    collection_name: Optional[str] = None
    use_vector_search: Optional[bool] = False
    top_k: Optional[int] = 20  # Increased from 5 to 20 for better coverage
    score_threshold: Optional[float] = 0.0  # Minimum similarity score (0.0-1.0)

class VectorizeRequest(BaseModel):
    db_key: str = "primary"
    collection_name: str
    text_fields: List[str]
    chunk_size: Optional[int] = 500
    overlap: Optional[int] = 50
    batch_size: Optional[int] = 100
    force: Optional[bool] = False

class SmartVectorizeRequest(BaseModel):
    db_key: str = "primary"
    collection_name: str
    text_fields: List[str]
    chunk_size: Optional[int] = 500
    overlap: Optional[int] = 50
    batch_size: Optional[int] = 100
    auto_detect: Optional[bool] = True
    max_documents: Optional[int] = None  # Limit number of documents to vectorize

class HybridSearchRequest(BaseModel):
    query: str
    db_key: Optional[str] = "primary"
    filters: Optional[Dict[str, Any]] = None
    top_k: Optional[int] = 30  # Increased for better results
    score_threshold: Optional[float] = 0.0

class MultiDBSyncRequest(BaseModel):
    db_keys: Optional[List[str]] = None  # None = all databases
    auto_detect_fields: Optional[bool] = True
    force: Optional[bool] = False
    max_documents_per_collection: Optional[int] = None  # Limit documents per collection

class VectorStatusRequest(BaseModel):
    db_key: Optional[str] = None  # None = all databases
    collection_name: Optional[str] = None  # None = all collections

# ============= HELPER FUNCTIONS =============
def serialize_document(doc: Any) -> Any:
    """Recursively serialize MongoDB documents"""
    if isinstance(doc, dict):
        return {key: serialize_document(value) for key, value in doc.items()}
    elif isinstance(doc, list):
        return [serialize_document(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, datetime):
        return doc.isoformat()
    else:
        return doc

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks"""
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    return chunks

def normalize_embedding(embedding: List[float]) -> List[float]:
    """Normalize embedding to unit length"""
    norm = sum(x * x for x in embedding) ** 0.5
    if norm == 0:
        return embedding
    return [x / norm for x in embedding]

async def get_embedding(text: str) -> List[float]:
    """Generate embedding using Sentence Transformers MiniLM with caching"""
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIMENSION
    
    # Check cache first
    cached = embedding_cache.get(text)
    if cached:
        return cached
    
    # No quota check needed - MiniLM is local and unlimited!
    
    try:
        # Generate embedding using MiniLM model
        embedding = embedding_model.encode(text, convert_to_numpy=True)
        embedding_list = embedding.tolist()
        
        # Normalize embedding
        embedding_normalized = normalize_embedding(embedding_list)
        
        # Cache the result
        embedding_cache.set(text, embedding_normalized)
        quota_manager.track_embedding()
        
        return embedding_normalized
    except Exception as e:
        print(f"❌ Embedding error: {e}")
        return [0.0] * EMBEDDING_DIMENSION

async def get_query_embedding(text: str) -> List[float]:
    """Generate embedding for query using Sentence Transformers MiniLM with caching"""
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIMENSION
    
    # Check cache first
    cached = embedding_cache.get(f"query:{text}")
    if cached:
        return cached
    
    # No quota check needed - MiniLM is local and unlimited!
    
    try:
        # Generate embedding using MiniLM model
        embedding = embedding_model.encode(text, convert_to_numpy=True)
        embedding_list = embedding.tolist()
        
        # Normalize embedding
        embedding_normalized = normalize_embedding(embedding_list)
        
        # Cache the result
        embedding_cache.set(f"query:{text}", embedding_normalized)
        quota_manager.track_embedding()
        
        return embedding_normalized
    except Exception as e:
        print(f"❌ Query embedding error: {e}")
        return [0.0] * EMBEDDING_DIMENSION

def build_qdrant_filter(
    db_key: Optional[str] = None,
    collection_filter: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    custom_filters: Optional[Dict[str, Any]] = None
) -> Optional[Filter]:
    """Build Qdrant filter from parameters"""
    conditions = []
    
    if db_key:
        conditions.append(
            FieldCondition(
                key="db_key",
                match=MatchValue(value=db_key)
            )
        )
    
    if collection_filter:
        conditions.append(
            FieldCondition(
                key="source_collection",
                match=MatchValue(value=collection_filter)
            )
        )
    
    if date_from:
        conditions.append(
            FieldCondition(
                key="created_at",
                range=Range(gte=date_from)
            )
        )
    
    if date_to:
        conditions.append(
            FieldCondition(
                key="created_at",
                range=Range(lte=date_to)
            )
        )
    
    if custom_filters:
        for key, value in custom_filters.items():
            conditions.append(
                FieldCondition(
                    key=f"metadata.{key}",
                    match=MatchValue(value=value)
                )
            )
    
    if not conditions:
        return None
    
    return Filter(must=conditions)

async def initialize_qdrant_collection_for_db(db_key: str, collection_name: str):
    """Initialize a Qdrant collection for a specific database"""
    try:
        collections = qdrant_client.get_collections().collections
        collection_names = [c.name for c in collections]
        
        # Check if collection exists and has correct dimensions
        if collection_name in collection_names:
            collection_info = qdrant_client.get_collection(collection_name)
            current_dim = collection_info.config.params.vectors.size
            
            if current_dim != EMBEDDING_DIMENSION:
                print(f"⚠️  Collection '{collection_name}' dimension mismatch: expected {EMBEDDING_DIMENSION}, got {current_dim}")
                print(f"🗑️  Deleting old collection '{collection_name}'...")
                qdrant_client.delete_collection(collection_name)
                print(f"✓ Old collection deleted")
                collection_names.remove(collection_name)
        
        if collection_name not in collection_names:
            print(f"Creating Qdrant collection: {collection_name} for database '{db_key}' (dimension: {EMBEDDING_DIMENSION})")
            
            qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=EMBEDDING_DIMENSION,
                    distance=Distance.COSINE
                ),
                hnsw_config=HnswConfigDiff(
                    m=16,
                    ef_construct=100,
                    full_scan_threshold=10000
                ),
                optimizers_config=OptimizersConfigDiff(
                    indexing_threshold=20000
                ),
                on_disk_payload=True
            )
            
            # Create payload indexes
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name="db_key",
                field_schema="keyword"
            )
            
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name="source_collection",
                field_schema="keyword"
            )
            
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name="source_doc_id",
                field_schema="keyword"
            )
            
            qdrant_client.create_payload_index(
                collection_name=collection_name,
                field_name="created_at",
                field_schema="datetime"
            )
            
            print(f"✓ Collection '{collection_name}' created with indexes")
        else:
            print(f"✓ Collection '{collection_name}' already exists (dimension: {EMBEDDING_DIMENSION})")
            
    except Exception as e:
        print(f"❌ Error initializing Qdrant collection '{collection_name}': {e}")
        raise

async def initialize_qdrant_collection():
    """Initialize Qdrant collections for all databases"""
    try:
        # Initialize collection for each database
        for db_key in MONGO_DATABASES.keys():
            collection_name = get_qdrant_collection_for_db(db_key)
            await initialize_qdrant_collection_for_db(db_key, collection_name)
            
    except Exception as e:
        print(f"❌ Error initializing Qdrant: {e}")
        raise

# ============= STARTUP EVENT =============
@app.on_event("startup")
async def startup_event():
    """Initialize Qdrant collection on startup"""
    try:
        await initialize_qdrant_collection()
        print(f"✓ Synapse DB API started with {len(databases)} database(s)")
        for db_key, config in MONGO_DATABASES.items():
            print(f"  - {db_key}: {config['name']}")
    except Exception as e:
        print(f"❌ Startup error: {e}")

# ============= DATABASE MANAGEMENT ENDPOINTS =============
@app.get("/databases")
async def list_databases():
    """List all configured databases"""
    db_info = []
    for db_key, config in MONGO_DATABASES.items():
        try:
            db_instance = databases[db_key]
            collections = await db_instance.list_collection_names()
            
            # Count total documents
            total_docs = 0
            for coll_name in collections:
                total_docs += await db_instance[coll_name].count_documents({})
            
            db_info.append({
                "key": db_key,
                "name": config["name"],
                "description": config.get("description", ""),
                "status": "connected",
                "collections_count": len(collections),
                "total_documents": total_docs
            })
        except Exception as e:
            db_info.append({
                "key": db_key,
                "name": config["name"],
                "status": "error",
                "error": str(e)
            })
    
    return {"databases": db_info, "total": len(db_info)}

@app.get("/databases/{db_key}/collections")
async def list_collections_in_database(db_key: str):
    """List all collections in a specific database"""
    if db_key not in databases:
        raise HTTPException(status_code=404, detail=f"Database '{db_key}' not found")
    
    try:
        db_instance = databases[db_key]
        collections = await db_instance.list_collection_names()
        collection_info = []
        
        for coll_name in collections:
            count = await db_instance[coll_name].count_documents({})
            
            # Check vector status
            state = await vector_state_manager.get_state(db_key, coll_name)
            
            collection_info.append({
                "name": coll_name,
                "document_count": count,
                "vectorized": state is not None,
                "vector_count": state.get("vector_count", 0) if state else 0,
                "last_vectorized": state.get("last_vectorized") if state else None
            })
        
        return {
            "db_key": db_key,
            "collections": collection_info,
            "total_collections": len(collections)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/databases/add")
async def add_database_connection(db_info: DatabaseInfo):
    """Add a new database connection permanently"""
    try:
        # Validate the connection string
        if not db_info.uri or not db_info.uri.startswith(('mongodb://', 'mongodb+srv://')):
            raise HTTPException(
                status_code=400, 
                detail="Invalid MongoDB connection string. Must start with mongodb:// or mongodb+srv://"
            )
        
        # Check if key already exists
        if db_info.key in MONGO_DATABASES:
            raise HTTPException(
                status_code=400,
                detail=f"Database key '{db_info.key}' already exists"
            )
        
        # Test the connection
        try:
            test_client = motor.motor_asyncio.AsyncIOMotorClient(db_info.uri, serverSelectionTimeoutMS=5000)
            await test_client.admin.command('ping')
            test_db = test_client[db_info.name]
            collections = await test_db.list_collection_names()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to connect to database: {str(e)}"
            )
        
        # Add to MONGO_DATABASES
        MONGO_DATABASES[db_info.key] = {
            "uri": db_info.uri,
            "name": db_info.name,
            "description": db_info.description or "User-added database"
        }
        
        # Initialize MongoDB client for this database
        mongo_clients[db_info.key] = test_client
        databases[db_info.key] = test_db
        
        # Save to file
        save_database_connections(MONGO_DATABASES)
        
        return {
            "status": "success",
            "message": f"Database '{db_info.key}' added successfully",
            "db_key": db_info.key,
            "name": db_info.name,
            "collections_count": len(collections),
            "saved_to_file": True
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/databases/{db_key}")
async def remove_database_connection(db_key: str):
    """Remove a database connection permanently"""
    try:
        if db_key not in MONGO_DATABASES:
            raise HTTPException(status_code=404, detail=f"Database '{db_key}' not found")
        
        if db_key == "primary":
            raise HTTPException(
                status_code=400,
                detail="Cannot remove primary database"
            )
        
        # Remove from dictionaries
        del MONGO_DATABASES[db_key]
        if db_key in mongo_clients:
            mongo_clients[db_key].close()
            del mongo_clients[db_key]
        if db_key in databases:
            del databases[db_key]
        
        # Save to file
        save_database_connections(MONGO_DATABASES)
        
        return {
            "status": "success",
            "message": f"Database '{db_key}' removed successfully",
            "removed_from_file": True
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= SMART VECTORIZATION ENDPOINTS =============
async def vectorize_with_progress(request: SmartVectorizeRequest):
    """Generator that yields progress updates during vectorization"""
    try:
        db_instance = databases.get(request.db_key)
        if db_instance is None:
            yield f"data: {json.dumps({'error': f'Database {request.db_key} not found'})}\n\n"
            return
        
        yield f"data: {json.dumps({'stage': 'init', 'message': f'Starting vectorization for {request.collection_name}...'})}\n\n"
        
        # Check if vectorization needed
        check_result = await vector_state_manager.needs_vectorization(
            request.db_key,
            request.collection_name,
            force=False
        )
        
        if not check_result["needs_vectorization"]:
            yield f"data: {json.dumps({'stage': 'skipped', 'reason': check_result['reason'], 'message': 'Collection already vectorized'})}\n\n"
            yield f"data: {json.dumps({'stage': 'complete', 'status': 'skipped'})}\n\n"
            return
        
        # Perform action based on reason
        action = check_result.get("action", "vectorize")
        
        if action == "clear_and_revectorize":
            yield f"data: {json.dumps({'stage': 'clearing', 'message': 'Clearing existing vectors...'})}\n\n"
            await clear_collection_vectors(request.db_key, request.collection_name)
            yield f"data: {json.dumps({'stage': 'cleared', 'message': 'Existing vectors cleared'})}\n\n"
        
        # Vectorize collection
        collection = db_instance[request.collection_name]
        
        # Apply document limit if specified
        if request.max_documents:
            documents = await collection.find().limit(request.max_documents).to_list(request.max_documents)
            yield f"data: {json.dumps({'stage': 'loaded', 'message': f'Loaded {len(documents)} documents (limited)'})}\n\n"
        else:
            documents = await collection.find().to_list(None)
            yield f"data: {json.dumps({'stage': 'loaded', 'message': f'Loaded {len(documents)} documents'})}\n\n"
        
        if not documents:
            yield f"data: {json.dumps({'error': 'Collection is empty'})}\n\n"
            return
        
        total_docs = len(documents)
        vectorized_count = 0
        total_chunks = 0
        batch_points = []
        
        for doc_idx, doc in enumerate(documents, 1):
            doc_id = str(doc.get("_id"))
            combined_text = " ".join([
                str(doc.get(field, ""))
                for field in request.text_fields
                if field in doc
            ])
            
            if not combined_text.strip():
                continue
            
            chunks = chunk_text(combined_text, request.chunk_size, request.overlap)
            
            for idx, chunk in enumerate(chunks):
                embedding = await get_embedding(chunk)
                
                point_id = str(uuid.uuid4())
                point = PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "db_key": request.db_key,
                        "source_collection": request.collection_name,
                        "source_doc_id": doc_id,
                        "chunk_index": idx,
                        "text": chunk,
                        "metadata": {
                            "text_fields": request.text_fields,
                            "db_name": MONGO_DATABASES[request.db_key]["name"]
                        },
                        "created_at": datetime.utcnow().isoformat()
                    }
                )
                
                batch_points.append(point)
                total_chunks += 1
                
                if len(batch_points) >= request.batch_size:
                    # Use database-specific collection
                    qdrant_collection = get_qdrant_collection_for_db(request.db_key)
                    qdrant_client.upsert(
                        collection_name=qdrant_collection,
                        points=batch_points
                    )
                    yield f"data: {json.dumps({'stage': 'batch_uploaded', 'message': f'Uploaded batch of {len(batch_points)} vectors'})}\n\n"
                    batch_points = []
            
            vectorized_count += 1
            
            # Progress update every 10 documents or at end
            if doc_idx % 10 == 0 or doc_idx == total_docs:
                progress_pct = int((doc_idx / total_docs) * 100)
                yield f"data: {json.dumps({'stage': 'processing', 'progress': progress_pct, 'current': doc_idx, 'total': total_docs, 'chunks': total_chunks, 'message': f'Processing: {doc_idx}/{total_docs} documents ({progress_pct}%)'})}\n\n"
        
        # Upsert remaining points
        if batch_points:
            qdrant_collection = get_qdrant_collection_for_db(request.db_key)
            qdrant_client.upsert(
                collection_name=qdrant_collection,
                points=batch_points
            )
            yield f"data: {json.dumps({'stage': 'final_batch', 'message': f'Uploaded final batch of {len(batch_points)} vectors'})}\n\n"
        
        # Update state
        yield f"data: {json.dumps({'stage': 'saving_state', 'message': 'Saving vectorization state...'})}\n\n"
        
        content_hash = await vector_state_manager.compute_content_hash(
            request.db_key,
            request.collection_name
        )
        
        await vector_state_manager.set_state(
            db_key=request.db_key,
            collection_name=request.collection_name,
            document_count=vectorized_count,
            vector_count=total_chunks,
            text_fields=request.text_fields,
            chunk_size=request.chunk_size,
            content_hash=content_hash
        )
        
        # Final success message
        yield f"data: {json.dumps({'stage': 'complete', 'status': 'success', 'documents_vectorized': vectorized_count, 'total_chunks': total_chunks, 'message': f'✓ Completed: {vectorized_count} documents, {total_chunks} chunks'})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e), 'stage': 'error'})}\n\n"

@app.post("/vectorize/smart")
async def smart_vectorize(request: SmartVectorizeRequest):
    """Smart vectorization with automatic duplicate prevention"""
    try:
        db_instance = databases.get(request.db_key)
        if db_instance is None:
            raise HTTPException(status_code=404, detail=f"Database '{request.db_key}' not found")
        
        # Check if vectorization needed
        check_result = await vector_state_manager.needs_vectorization(
            request.db_key,
            request.collection_name,
            force=False
        )
        
        if not check_result["needs_vectorization"]:
            return {
                "status": "skipped",
                "reason": check_result["reason"],
                "message": "Collection already vectorized and up-to-date",
                "details": check_result,
                "db_key": request.db_key,
                "collection": request.collection_name
            }
        
        # Perform action based on reason
        action = check_result.get("action", "vectorize")
        
        if action == "clear_and_revectorize":
            # Clear existing vectors
            await clear_collection_vectors(request.db_key, request.collection_name)
            print(f"✓ Cleared existing vectors for {request.db_key}.{request.collection_name}")
        
        # Vectorize collection
        collection = db_instance[request.collection_name]
        
        # Apply document limit if specified
        if request.max_documents:
            documents = await collection.find().limit(request.max_documents).to_list(request.max_documents)
            print(f"ℹ️  Limiting to {request.max_documents} documents to save quota")
        else:
            documents = await collection.find().to_list(None)
        
        if not documents:
            raise HTTPException(status_code=404, detail="Collection is empty")
        
        vectorized_count = 0
        total_chunks = 0
        batch_points = []
        
        for doc in documents:
            doc_id = str(doc.get("_id"))
            combined_text = " ".join([
                str(doc.get(field, ""))
                for field in request.text_fields
                if field in doc
            ])
            
            if not combined_text.strip():
                continue
            
            chunks = chunk_text(combined_text, request.chunk_size, request.overlap)
            
            for idx, chunk in enumerate(chunks):
                embedding = await get_embedding(chunk)
                
                point_id = str(uuid.uuid4())
                point = PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "db_key": request.db_key,
                        "source_collection": request.collection_name,
                        "source_doc_id": doc_id,
                        "chunk_index": idx,
                        "text": chunk,
                        "metadata": {
                            "text_fields": request.text_fields,
                            "db_name": MONGO_DATABASES[request.db_key]["name"]
                        },
                        "created_at": datetime.utcnow().isoformat()
                    }
                )
                
                batch_points.append(point)
                total_chunks += 1
                
                if len(batch_points) >= request.batch_size:
                    # Use database-specific collection
                    qdrant_collection = get_qdrant_collection_for_db(request.db_key)
                    qdrant_client.upsert(
                        collection_name=qdrant_collection,
                        points=batch_points
                    )
                    batch_points = []
            
            vectorized_count += 1
        
        # Upsert remaining points
        if batch_points:
            # Use database-specific collection
            qdrant_collection = get_qdrant_collection_for_db(request.db_key)
            qdrant_client.upsert(
                collection_name=qdrant_collection,
                points=batch_points
            )
        
        # Update state
        content_hash = await vector_state_manager.compute_content_hash(
            request.db_key,
            request.collection_name
        )
        
        await vector_state_manager.set_state(
            db_key=request.db_key,
            collection_name=request.collection_name,
            document_count=vectorized_count,
            vector_count=total_chunks,
            text_fields=request.text_fields,
            chunk_size=request.chunk_size,
            content_hash=content_hash
        )
        
        return {
            "status": "success",
            "action": action,
            "reason": check_result["reason"],
            "db_key": request.db_key,
            "collection": request.collection_name,
            "documents_vectorized": vectorized_count,
            "total_chunks": total_chunks,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorize/smart/stream")
async def smart_vectorize_stream(request: SmartVectorizeRequest):
    """Smart vectorization with real-time progress streaming"""
    return StreamingResponse(
        vectorize_with_progress(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.post("/vectorize/check")
async def check_vectorization_status(request: VectorStatusRequest):
    """Check vectorization status for collections"""
    try:
        results = []
        
        # Determine which databases to check
        db_keys_to_check = [request.db_key] if request.db_key else list(databases.keys())
        
        for db_key in db_keys_to_check:
            db_instance = databases.get(db_key)
            if db_instance is None:
                continue
            
            # Determine which collections to check
            if request.collection_name:
                collections = [request.collection_name]
            else:
                collections = await db_instance.list_collection_names()
                # Filter out system collections
                system_collections = ['vector_state', 'query_memory', 'dashboards', 'simulations']
                collections = [c for c in collections if c not in system_collections]
            
            for coll_name in collections:
                doc_count = await db_instance[coll_name].count_documents({})
                
                if doc_count == 0:
                    continue
                
                check_result = await vector_state_manager.needs_vectorization(
                    db_key,
                    coll_name
                )
                
                state = await vector_state_manager.get_state(db_key, coll_name)
                
                results.append({
                    "db_key": db_key,
                    "db_name": MONGO_DATABASES[db_key]["name"],
                    "collection": coll_name,
                    "document_count": doc_count,
                    "needs_vectorization": check_result["needs_vectorization"],
                    "reason": check_result["reason"],
                    "action": check_result.get("action"),
                    "vector_count": state.get("vector_count", 0) if state else 0,
                    "last_vectorized": state.get("last_vectorized") if state else None
                })
        
        return {
            "results": results,
            "total_checked": len(results),
            "needs_attention": len([r for r in results if r["needs_vectorization"]]),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/vectorize/sync-all")
async def sync_all_databases(request: MultiDBSyncRequest):
    """Sync vectorization across all databases"""
    try:
        db_keys = request.db_keys or list(databases.keys())
        
        sync_results = []
        
        for db_key in db_keys:
            db_instance = databases.get(db_key)
            if db_instance is None:
                continue
            
            collections = await db_instance.list_collection_names()
            system_collections = ['vector_state', 'query_memory', 'dashboards', 'simulations']
            collections = [c for c in collections if c not in system_collections]
            
            for coll_name in collections:
                doc_count = await db_instance[coll_name].count_documents({})
                
                if doc_count == 0:
                    continue
                
                # Apply document limit
                effective_limit = min(doc_count, request.max_documents_per_collection) if request.max_documents_per_collection else doc_count
                
                # Check if needs vectorization
                check_result = await vector_state_manager.needs_vectorization(
                    db_key,
                    coll_name,
                    force=request.force
                )
                
                if not check_result["needs_vectorization"] and not request.force:
                    sync_results.append({
                        "db_key": db_key,
                        "collection": coll_name,
                        "status": "skipped",
                        "reason": check_result["reason"]
                    })
                    continue
                
                # Auto-detect text fields
                if request.auto_detect_fields:
                    sample_doc = await db_instance[coll_name].find_one()
                    if sample_doc:
                        # Get all string fields (including short ones) and common nested fields
                        text_fields = []
                        for k, v in sample_doc.items():
                            if k == '_id':
                                continue
                            # Include strings of any length
                            if isinstance(v, str) and v.strip():
                                text_fields.append(k)
                            # Include nested objects (might contain strings)
                            elif isinstance(v, dict):
                                text_fields.append(k)
                            # Include arrays of strings
                            elif isinstance(v, list) and len(v) > 0 and isinstance(v[0], str):
                                text_fields.append(k)
                        
                        # Limit to 10 fields to avoid too much data
                        text_fields = text_fields[:10]
                    else:
                        text_fields = []
                else:
                    text_fields = ["name", "description", "text", "title", "content", "username", "address", "email"]
                
                if not text_fields:
                    sync_results.append({
                        "db_key": db_key,
                        "collection": coll_name,
                        "status": "skipped",
                        "reason": "no_text_fields"
                    })
                    continue
                
                # Vectorize
                try:
                    vectorize_request = SmartVectorizeRequest(
                        db_key=db_key,
                        collection_name=coll_name,
                        text_fields=text_fields,
                        max_documents=request.max_documents_per_collection
                    )
                    result = await smart_vectorize(vectorize_request)
                    sync_results.append({
                        "db_key": db_key,
                        "collection": coll_name,
                        "status": result["status"],
                        "documents_vectorized": result.get("documents_vectorized", 0),
                        "total_chunks": result.get("total_chunks", 0)
                    })
                except Exception as e:
                    sync_results.append({
                        "db_key": db_key,
                        "collection": coll_name,
                        "status": "error",
                        "error": str(e)
                    })
        
        return {
            "sync_results": sync_results,
            "total_collections": len(sync_results),
            "successful": len([r for r in sync_results if r["status"] == "success"]),
            "skipped": len([r for r in sync_results if r["status"] == "skipped"]),
            "errors": len([r for r in sync_results if r["status"] == "error"]),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def clear_collection_vectors(db_key: str, collection_name: str):
    """Clear vectors for a specific collection from the database-specific Qdrant collection"""
    # Get the Qdrant collection for this database
    qdrant_collection = get_qdrant_collection_for_db(db_key)
    
    # Check if collection exists
    try:
        collections = qdrant_client.get_collections().collections
        collection_names = [c.name for c in collections]
        if qdrant_collection not in collection_names:
            print(f"⚠️  Qdrant collection '{qdrant_collection}' not found")
            return 0
    except Exception as e:
        print(f"❌ Error checking Qdrant collection: {e}")
        return 0
    
    qdrant_filter = Filter(
        must=[
            FieldCondition(key="db_key", match=MatchValue(value=db_key)),
            FieldCondition(key="source_collection", match=MatchValue(value=collection_name))
        ]
    )
    
    points_to_delete = []
    offset = None
    
    while True:
        result = qdrant_client.scroll(
            collection_name=qdrant_collection,
            scroll_filter=qdrant_filter,
            limit=100,
            offset=offset,
            with_payload=False,
            with_vectors=False
        )
        
        points_to_delete.extend([point.id for point in result[0]])
        
        if result[1] is None:
            break
        offset = result[1]
    
    if points_to_delete:
        qdrant_client.delete(
            collection_name=qdrant_collection,
            points_selector=points_to_delete
        )
    
    return len(points_to_delete)

@app.delete("/vectors/clear")
async def clear_vectors(
    db_key: Optional[str] = None,
    collection_name: Optional[str] = None
):
    """Clear vector embeddings"""
    try:
        if db_key and collection_name:
            # Clear specific collection
            deleted_count = await clear_collection_vectors(db_key, collection_name)
            await vector_state_manager.clear_state(db_key, collection_name)
            
            return {
                "status": "cleared",
                "db_key": db_key,
                "collection": collection_name,
                "deleted_count": deleted_count
            }
        elif db_key:
            # Clear all collections in database by deleting the entire Qdrant collection for this DB
            db_instance = databases.get(db_key)
            if db_instance is None:
                raise HTTPException(status_code=404, detail=f"Database '{db_key}' not found")
            
            # Get the Qdrant collection for this database
            qdrant_collection = get_qdrant_collection_for_db(db_key)
            
            try:
                # Delete the entire Qdrant collection for this database
                collections = qdrant_client.get_collections().collections
                collection_names = [c.name for c in collections]
                
                total_deleted = 0
                if qdrant_collection in collection_names:
                    # Get count before deletion
                    collection_info = qdrant_client.get_collection(qdrant_collection)
                    total_deleted = collection_info.points_count
                    
                    # Delete the collection
                    qdrant_client.delete_collection(qdrant_collection)
                    print(f"🗑️  Deleted Qdrant collection '{qdrant_collection}' for database '{db_key}'")
                    
                    # Recreate the empty collection
                    await initialize_qdrant_collection_for_db(db_key, qdrant_collection)
                
                # Clear all vector states for this database
                mongo_collections = await db_instance.list_collection_names()
                for coll_name in mongo_collections:
                    await vector_state_manager.clear_state(db_key, coll_name)
                
                return {
                    "status": "cleared",
                    "db_key": db_key,
                    "qdrant_collection": qdrant_collection,
                    "collections_cleared": len(mongo_collections),
                    "total_deleted": total_deleted
                }
            except Exception as e:
                print(f"❌ Error clearing vectors for database '{db_key}': {e}")
                raise HTTPException(status_code=500, detail=str(e))
        else:
            # Clear all vectors from all databases
            total_deleted = 0
            deleted_collections = []
            
            for db_key in databases.keys():
                try:
                    qdrant_collection = get_qdrant_collection_for_db(db_key)
                    collections = qdrant_client.get_collections().collections
                    collection_names = [c.name for c in collections]
                    
                    if qdrant_collection in collection_names:
                        collection_info = qdrant_client.get_collection(qdrant_collection)
                        total_deleted += collection_info.points_count
                        
                        qdrant_client.delete_collection(qdrant_collection)
                        deleted_collections.append(qdrant_collection)
                except Exception as e:
                    print(f"⚠️  Error deleting collection for '{db_key}': {e}")
            
            # Reinitialize all collections
            await initialize_qdrant_collection()
            
            # Clear all states
            for db_key in databases.keys():
                db_instance = databases[db_key]
                await db_instance["vector_state"].delete_many({})
            
            return {
                "status": "collection_reset",
                "message": "All vectors cleared and collection recreated"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= DEBUG ENDPOINTS =============
@app.get("/debug/qdrant-collections")
async def debug_qdrant_collections():
    """Debug endpoint to inspect Qdrant collections"""
    try:
        all_collections = qdrant_client.get_collections().collections
        result = []
        
        for coll in all_collections:
            try:
                info = qdrant_client.get_collection(coll.name)
                
                # Get a few sample points
                sample_points = qdrant_client.scroll(
                    collection_name=coll.name,
                    limit=3,
                    with_payload=True,
                    with_vectors=False
                )[0]
                
                sample_payloads = [p.payload for p in sample_points]
                
                result.append({
                    "name": coll.name,
                    "points_count": info.points_count,
                    "vectors_config": str(info.config.params.vectors),
                    "sample_payloads": sample_payloads
                })
            except Exception as e:
                result.append({
                    "name": coll.name,
                    "error": str(e)
                })
        
        return {
            "total_collections": len(all_collections),
            "collections": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= VECTOR QUERY ENDPOINTS =============
@app.post("/query/natural")
async def natural_language_query(request: QueryRequest):
    """Natural language query - alias for vector RAG"""
    return await vector_rag_query(request)

@app.post("/query/vector-rag")
async def vector_rag_query(request: QueryRequest):
    """Query using vector similarity search across databases"""
    try:
        # Get database schema information for VECTORIZED collections only
        db_instance = databases.get(request.db_key or "primary")
        schema_info = ""
        vectorized_collections = []
        
        if db_instance is not None:
            try:
                # Get vectorized collections directly from Qdrant (ground truth)
                db_key_to_check = request.db_key or "primary"
                
                # Query Qdrant to find which collections have vectors for this database
                try:
                    # Get the Qdrant collection for this database
                    qdrant_collection = get_qdrant_collection_for_db(db_key_to_check)
                    
                    # Check if collection exists
                    collections = qdrant_client.get_collections().collections
                    collection_names = [c.name for c in collections]
                    
                    if qdrant_collection not in collection_names:
                        print(f"⚠️  Qdrant collection '{qdrant_collection}' not found for database '{db_key_to_check}'")
                        print(f"   Available collections: {collection_names}")
                        vectorized_collections = []
                    else:
                        # Get collection info to check if it has any points
                        try:
                            collection_info = qdrant_client.get_collection(qdrant_collection)
                            point_count = collection_info.points_count
                            print(f"📊 Qdrant collection '{qdrant_collection}' has {point_count} points")
                            
                            if point_count == 0:
                                print(f"⚠️  Collection is empty - no vectors found")
                                vectorized_collections = []
                            else:
                                # Scroll through Qdrant to find unique collections
                                collections_in_qdrant = set()
                                offset = None
                                total_points_checked = 0
                                
                                while True:
                                    result = qdrant_client.scroll(
                                        collection_name=qdrant_collection,
                                        scroll_filter=Filter(
                                            must=[
                                                FieldCondition(
                                                    key="db_key",
                                                    match=MatchValue(value=db_key_to_check)
                                                )
                                            ]
                                        ),
                                        limit=100,
                                        offset=offset,
                                        with_payload=True,
                                        with_vectors=False
                                    )
                                    
                                    total_points_checked += len(result[0])
                                    print(f"   Checked {total_points_checked} points so far...")
                                    
                                    for point in result[0]:
                                        coll_name = point.payload.get("source_collection")
                                        if coll_name:
                                            collections_in_qdrant.add(coll_name)
                                    
                                    if result[1] is None:
                                        break
                                    offset = result[1]
                                
                                vectorized_collections = list(collections_in_qdrant)
                                print(f"   Found {len(vectorized_collections)} unique collections with vectors")
                        except Exception as scroll_error:
                            print(f"❌ Error scrolling collection: {scroll_error}")
                            vectorized_collections = []
                except Exception as e:
                    print(f"Error checking Qdrant: {e}")
                    vectorized_collections = []
                
                # If specific collection requested, use only that
                if request.collection_name:
                    target_collections = [request.collection_name] if request.collection_name in vectorized_collections else []
                else:
                    # Use ALL vectorized collections found in Qdrant
                    target_collections = vectorized_collections
                
                schema_parts = []
                for coll_name in target_collections:
                    # Get sample document to understand schema
                    sample = await db_instance[coll_name].find_one()
                    if sample:
                        fields = list(sample.keys())
                        fields = [f for f in fields if f != '_id']  # Remove _id
                        
                        # Limit to first 15 fields per collection to avoid token overflow
                        if len(fields) > 15:
                            displayed_fields = ', '.join(fields[:15]) + f' (and {len(fields)-15} more fields)'
                        else:
                            displayed_fields = ', '.join(fields)
                        
                        schema_parts.append(f"{coll_name}: {displayed_fields}")
                
                schema_info = "\n".join(schema_parts)
                
                if not schema_info:
                    schema_info = "No vectorized collections found"
                    
                print(f"📚 Vectorized collections: {vectorized_collections}")
            except Exception as e:
                print(f"Could not fetch schema: {e}")
                schema_info = "Schema unavailable"
        
        # Step 1: Use Gemini to extract keywords from the query based on schema
        print(f"🔍 Original query: {request.query}")
        print(f"📊 Searching across {len(target_collections)} collections: {', '.join(target_collections)}")
        
        keyword_prompt = f"""You are a search query optimizer. Extract the most important keywords and concepts from the user's query that would be useful for semantic search.

Available Database Collections and Fields:
{schema_info}

User Query: "{request.query}"

Task: Extract 3-5 key search terms or phrases that capture the essence of what the user is looking for. Consider:
- Important nouns and entities
- Actions or verbs
- Relevant field names from the schema
- Related concepts

Return ONLY the keywords/phrases separated by spaces (no explanation, no bullets, just the terms).

Keywords:"""
        
        print(f"🤖 Using Gemini to extract search keywords...")
        keyword_response = llm_model.generate_content(keyword_prompt)
        search_keywords = keyword_response.text.strip()
        quota_manager.track_llm()
        
        print(f"🎯 Extracted keywords: {search_keywords}")
        
        # Step 2: Create vector embedding from the keywords using MiniLM
        print(f"🧠 Creating 384-dim vector embedding from keywords...")
        query_embedding = await get_query_embedding(search_keywords)
        print(f"✓ Embedding created: {len(query_embedding)} dimensions")
        
        # Build filter
        qdrant_filter = build_qdrant_filter(
            db_key=request.db_key,
            collection_filter=request.collection_name
        )
        
        # Get the Qdrant collection for this database
        db_key_for_search = request.db_key or "primary"
        qdrant_collection = get_qdrant_collection_for_db(db_key_for_search)
        
        # Check if collection exists before searching
        collections = qdrant_client.get_collections().collections
        collection_names = [c.name for c in collections]
        
        if qdrant_collection not in collection_names:
            return {
                "query": request.query,
                "error": f"No vectors found for database '{db_key_for_search}'. Vectorize collections first.",
                "hint": "Use POST /vectorize/smart to create embeddings"
            }
        
        # Search in Qdrant (database-specific collection)
        print(f"🔎 Searching for top {request.top_k} results with score_threshold >= {request.score_threshold}...")
        search_result = qdrant_client.search(
            collection_name=qdrant_collection,
            query_vector=query_embedding,
            query_filter=qdrant_filter,
            limit=request.top_k,
            score_threshold=request.score_threshold,
            with_payload=True,
            with_vectors=False
        )
        
        print(f"📊 Raw results from Qdrant: {len(search_result)} items")
        if search_result:
            print(f"   Score range: {min(h.score for h in search_result):.3f} - {max(h.score for h in search_result):.3f}")
        
        if not search_result:
            return {
                "query": request.query,
                "search_keywords": search_keywords,
                "error": "No matching results found. Try adjusting your query or lowering the similarity threshold.",
                "hint": "The database has been vectorized but no results matched your query closely enough.",
                "results_found": 0
            }
        
        # Extract context from results
        context = "\n\n".join([
            f"[DB: {hit.payload.get('db_key')}, Collection: {hit.payload.get('source_collection')}, Similarity: {hit.score:.3f}]\n{hit.payload.get('text', '')}"
            for hit in search_result
        ])
        
        sources = [
            {
                "db_key": hit.payload.get("db_key"),
                "db_name": hit.payload.get("metadata", {}).get("db_name"),
                "collection": hit.payload.get("source_collection"),
                "doc_id": hit.payload.get("source_doc_id"),
                "similarity": hit.score,
                "text_preview": hit.payload.get("text", "")[:200]
            }
            for hit in search_result
        ]
        
        # Log collection distribution
        collection_counts = {}
        for source in sources:
            coll = source['collection']
            collection_counts[coll] = collection_counts.get(coll, 0) + 1
        print(f"📚 Results by collection: {collection_counts}")
        
        # Generate answer using Gemini
        if not quota_manager.can_llm():
            return {
                "query": request.query,
                "answer": "LLM quota exceeded. Returning raw context.",
                "context": context[:500],
                "method": "vector_rag",
                "sources": sources,
                "quota_warning": True
            }
        
        prompt = f"""Based on the following context from multiple databases, answer the user's question.

Context:
{context}

Question: {request.query}

Provide a clear, concise answer based only on the context provided. Mention which database/collection the information comes from when relevant."""
        
        response = llm_model.generate_content(prompt)
        quota_manager.track_llm()
        
        # Generate chart data from the retrieved documents
        chart_data = None
        try:
            # Get actual documents from sources for chart generation
            unique_sources = {}
            for source in sources:
                key = f"{source['db_key']}:{source['collection']}"
                if key not in unique_sources:
                    unique_sources[key] = []
                unique_sources[key].append(source['doc_id'])
            
            # Fetch documents from MongoDB
            aggregated_docs = []
            for source_key, doc_ids in unique_sources.items():
                db_key, collection_name = source_key.split(':')
                db_inst = databases.get(db_key)
                if db_inst is not None:
                    docs = await db_inst[collection_name].find(
                        {"_id": {"$in": [doc_id for doc_id in doc_ids]}}
                    ).limit(20).to_list(20)
                    aggregated_docs.extend(docs)
            
            # Use Gemini to analyze data and suggest chart
            if aggregated_docs:
                chart_prompt = f"""Analyze this data and determine if it can be visualized as a chart.
If yes, provide a JSON chart configuration. If no, return null.

Data Sample (first 3 documents):
{str(aggregated_docs[:3])}

User Query: {request.query}

Return a JSON object with this structure if data is chartable:
{{
  "chartType": "bar|line|pie|doughnut",
  "title": "Chart Title",
  "labels": ["label1", "label2", ...],
  "datasets": [
    {{
      "label": "Dataset Name",
      "data": [value1, value2, ...]
    }}
  ]
}}

Return exactly: null  (if data cannot be meaningfully visualized)

Chart Configuration:"""
                
                chart_response = llm_model.generate_content(chart_prompt)
                chart_json = chart_response.text.strip()
                
                # Try to parse chart JSON
                if chart_json and chart_json.lower() != "null":
                    # Remove markdown code blocks if present
                    chart_json = chart_json.replace('```json', '').replace('```', '').strip()
                    try:
                        chart_data = eval(chart_json) if chart_json.startswith('{') else None
                        print(f"📊 Chart generated: {chart_data.get('chartType') if chart_data else 'None'}")
                    except:
                        print(f"⚠️  Could not parse chart data")
        except Exception as e:
            print(f"⚠️  Chart generation failed: {e}")
        
        print(f"✓ Found {len(sources)} relevant sources")
        print(f"📝 Generating answer using Gemini...")
        
        return {
            "query": request.query,
            "search_keywords": search_keywords,
            "answer": response.text,
            "method": "hybrid_keyword_semantic",
            "embedding_model": "all-MiniLM-L6-v2",
            "embedding_dimensions": 384,
            "sources": sources,
            "total_sources": len(sources),
            "databases_searched": list(set([s["db_key"] for s in sources])),
            "collections_searched": list(set([s["collection"] for s in sources])),
            "chart_data": chart_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/mongodb-vector-search")
async def mongodb_vector_search(request: QueryRequest):
    """Search directly in MongoDB Atlas using vector search (skip Qdrant)"""
    try:
        # Get database instance
        db_instance = databases.get(request.db_key or "primary")
        if db_instance is None:
            raise HTTPException(status_code=400, detail=f"Database '{request.db_key}' not found")
        
        # Get all collections in the database
        collection_names = await db_instance.list_collection_names()
        print(f"📚 Found {len(collection_names)} collections in database")
        
        # Build schema info
        schema_parts = []
        for coll_name in collection_names[:20]:  # Limit to first 20 collections
            sample = await db_instance[coll_name].find_one()
            if sample:
                fields = [f for f in sample.keys() if f != '_id'][:10]
                schema_parts.append(f"{coll_name}: {', '.join(fields)}")
        
        schema_info = "\n".join(schema_parts) if schema_parts else "No collections found"
        
        # Extract keywords using Gemini
        print(f"🔍 Query: {request.query}")
        keyword_prompt = f"""Extract 3-5 key search terms from this query for semantic search.

Database Collections: {', '.join(collection_names)}
Schema: {schema_info}

Query: "{request.query}"

Return ONLY keywords separated by spaces:"""
        
        keyword_response = llm_model.generate_content(keyword_prompt)
        search_keywords = keyword_response.text.strip()
        quota_manager.track_llm()
        print(f"🎯 Keywords: {search_keywords}")
        
        # Create embedding for keywords
        query_embedding = await get_query_embedding(search_keywords)
        
        # Search across all collections with vector indexes
        all_results = []
        
        # Try to search collections that might have vector indexes
        for coll_name in collection_names:
            try:
                # MongoDB Atlas Vector Search aggregation pipeline
                pipeline = [
                    {
                        "$vectorSearch": {
                            "index": "vector_index",  # Your Atlas vector search index name
                            "path": "embedding",      # Field containing the vector
                            "queryVector": query_embedding,
                            "numCandidates": 100,
                            "limit": request.top_k
                        }
                    },
                    {
                        "$project": {
                            "_id": 1,
                            "score": {"$meta": "vectorSearchScore"},
                            "text": 1,
                            "content": 1,
                            "title": 1,
                            "description": 1
                        }
                    }
                ]
                
                results = await db_instance[coll_name].aggregate(pipeline).to_list(request.top_k)
                
                if results:
                    print(f"✓ Found {len(results)} results in {coll_name}")
                    for doc in results:
                        doc['_collection'] = coll_name
                        all_results.append(doc)
                        
            except Exception as e:
                # Collection might not have vector index, skip it
                continue
        
        if not all_results:
            return {
                "query": request.query,
                "search_keywords": search_keywords,
                "error": "No vector search results found. Make sure collections have 'vector_index' configured.",
                "hint": "Check MongoDB Atlas vector search index configuration"
            }
        
        # Sort by score and limit
        all_results.sort(key=lambda x: x.get('score', 0), reverse=True)
        all_results = all_results[:request.top_k]
        
        # Build context from results
        context_parts = []
        sources = []
        
        for doc in all_results:
            # Extract text from various possible fields
            text = (
                doc.get('text') or 
                doc.get('content') or 
                doc.get('description') or 
                doc.get('title') or 
                str(doc.get('_id'))
            )
            
            collection = doc.get('_collection', 'unknown')
            score = doc.get('score', 0)
            
            context_parts.append(f"[Collection: {collection}, Score: {score:.3f}]\n{text}")
            
            sources.append({
                "db_key": request.db_key or "primary",
                "collection": collection,
                "doc_id": str(doc.get('_id')),
                "similarity": score,
                "text_preview": str(text)[:200]
            })
        
        context = "\n\n".join(context_parts)
        
        # Generate answer using Gemini
        prompt = f"""Based on the following context from MongoDB, answer the user's question.

Context:
{context}

Question: {request.query}

Provide a clear, concise answer based on the context."""
        
        response = llm_model.generate_content(prompt)
        quota_manager.track_llm()
        
        print(f"✓ Generated answer from {len(sources)} sources")
        
        return {
            "query": request.query,
            "search_keywords": search_keywords,
            "answer": response.text,
            "method": "mongodb_atlas_vector_search",
            "embedding_model": "all-MiniLM-L6-v2",
            "embedding_dimensions": 384,
            "sources": sources,
            "total_sources": len(sources),
            "collections_searched": list(set([s["collection"] for s in sources])),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error in MongoDB vector search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/hybrid-search")
async def hybrid_search(request: HybridSearchRequest):
    """Advanced hybrid search with multi-database support"""
    try:
        query_embedding = await get_query_embedding(request.query)
        
        # Build filter
        qdrant_filter = build_qdrant_filter(
            db_key=request.db_key,
            custom_filters=request.filters
        )
        
        # Search with filters
        search_result = qdrant_client.search(
            collection_name=QDRANT_COLLECTION_NAME,
            query_vector=query_embedding,
            query_filter=qdrant_filter,
            limit=request.top_k,
            score_threshold=request.score_threshold,
            with_payload=True,
            with_vectors=False
        )
        
        results = [
            {
                "id": hit.id,
                "score": hit.score,
                "db_key": hit.payload.get("db_key"),
                "collection": hit.payload.get("source_collection"),
                "text": hit.payload.get("text"),
                "metadata": hit.payload.get("metadata", {}),
                "created_at": hit.payload.get("created_at")
            }
            for hit in search_result
        ]
        
        return {
            "query": request.query,
            "filters_applied": request.filters,
            "results": results,
            "total_results": len(results),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vectors/stats")
async def get_vector_stats():
    """Get detailed statistics across all databases (each with separate Qdrant collection)"""
    try:
        # Get all Qdrant collections
        all_collections = qdrant_client.get_collections().collections
        collection_names = [c.name for c in all_collections]
        
        # Get breakdown by database and collection
        db_breakdown = defaultdict(lambda: defaultdict(int))
        total_vectors = 0
        
        # Iterate through each database's Qdrant collection
        for db_key in MONGO_DATABASES.keys():
            qdrant_collection = get_qdrant_collection_for_db(db_key)
            
            if qdrant_collection not in collection_names:
                continue
                
            # Get collection info
            collection_info = qdrant_client.get_collection(qdrant_collection)
            total_vectors += collection_info.points_count
            
            # Scroll through this collection
            offset = None
            while True:
                result = qdrant_client.scroll(
                    collection_name=qdrant_collection,
                    limit=100,
                    offset=offset,
                    with_payload=True,
                    with_vectors=False
                )
                
                for point in result[0]:
                    db_key_from_payload = point.payload.get("db_key", db_key)
                    coll_name = point.payload.get("source_collection", "unknown")
                    db_breakdown[db_key_from_payload][coll_name] += 1
                
                if result[1] is None:
                    break
                offset = result[1]
        
        # Format breakdown
        formatted_breakdown = []
        for db_key, collections in db_breakdown.items():
            for coll_name, count in collections.items():
                formatted_breakdown.append({
                    "db_key": db_key,
                    "db_name": MONGO_DATABASES.get(db_key, {}).get("name", "unknown"),
                    "collection": coll_name,
                    "vector_count": count
                })
        
        # Get database summaries with Qdrant collection names
        db_summaries = []
        for db_key in MONGO_DATABASES.keys():
            qdrant_collection = get_qdrant_collection_for_db(db_key)
            vector_count = sum(item["vector_count"] for item in formatted_breakdown if item["db_key"] == db_key)
            
            db_summaries.append({
                "db_key": db_key,
                "db_name": MONGO_DATABASES.get(db_key, {}).get("name", "unknown"),
                "qdrant_collection": qdrant_collection,
                "total_vectors": vector_count
            })
        
        return {
            "total_vectors": total_vectors,
            "vector_dimension": EMBEDDING_DIMENSION,
            "distance_metric": "COSINE",
            "qdrant_clusters": len([c for c in collection_names if c.startswith("synapse_")]),
            "database_summary": db_summaries,
            "collection_breakdown": formatted_breakdown,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/qdrant/clusters")
async def get_qdrant_clusters():
    """Get Qdrant cluster configuration for all databases"""
    try:
        clusters = load_qdrant_clusters()
        
        # Enrich with real-time stats from Qdrant
        all_collections = qdrant_client.get_collections().collections
        collection_names = [c.name for c in all_collections]
        
        for db_key, cluster_info in clusters.get("clusters", {}).items():
            collection_name = cluster_info["collection_name"]
            if collection_name in collection_names:
                try:
                    collection_info = qdrant_client.get_collection(collection_name)
                    cluster_info["vector_count"] = collection_info.points_count
                    cluster_info["status"] = collection_info.status
                    cluster_info["exists"] = True
                except Exception as e:
                    cluster_info["exists"] = False
                    cluster_info["error"] = str(e)
            else:
                cluster_info["exists"] = False
        
        return clusters
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/quota/stats")
async def get_quota_stats():
    """Get quota usage statistics"""
    return quota_manager.stats()

@app.post("/quota/reset")
async def reset_quota():
    """Reset quota counters (admin only)"""
    quota_manager.reset()
    return {
        "status": "reset",
        "message": "Quota counters have been reset",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/cache/stats")
async def get_cache_stats():
    """Get embedding cache statistics"""
    return embedding_cache.stats()

@app.post("/cache/clear")
async def clear_cache():
    """Clear embedding cache"""
    size_before = len(embedding_cache.cache)
    embedding_cache.cache.clear()
    embedding_cache.hits = 0
    embedding_cache.misses = 0
    return {
        "status": "cleared",
        "items_cleared": size_before,
        "timestamp": datetime.utcnow().isoformat()
    }

# ============= HEALTH CHECK =============
@app.get("/")
async def root():
    return {
        "message": "Synapse DB API - Enhanced Multi-Database Edition",
        "version": "5.0.0",
        "features": [
            "Multi-Database Support",
            "Smart Vectorization with Duplicate Prevention",
            "Automatic Vector Lifecycle Management",
            "Vector RAG (Semantic Search)",
            "Hybrid Search",
            "Cross-Database Queries",
            "Dashboard Generation",
            "File Upload & Export"
        ],
        "databases_configured": len(databases)
    }

@app.get("/health")
async def health_check():
    try:
        db_statuses = {}
        
        # Check all MongoDB databases
        for db_key, db_instance in databases.items():
            try:
                await mongo_clients[db_key].admin.command('ping')
                collections = await db_instance.list_collection_names()
                db_statuses[db_key] = {
                    "status": "connected",
                    "collections": len(collections)
                }
            except Exception as e:
                db_statuses[db_key] = {
                    "status": "error",
                    "error": str(e)
                }
        
        # Check Qdrant
        try:
            collection_info = qdrant_client.get_collection(QDRANT_COLLECTION_NAME)
            vector_count = collection_info.points_count
            qdrant_status = "connected"
        except Exception as e:
            vector_count = 0
            qdrant_status = f"error: {str(e)}"
        
        return {
            "status": "healthy",
            "databases": db_statuses,
            "qdrant": qdrant_status,
            "qdrant_url": QDRANT_URL,
            "vector_embeddings_stored": vector_count,
            "quota_stats": quota_manager.stats(),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

# ============= FILE UPLOAD (Multi-DB Support) =============
@app.post("/upload/csv")
async def upload_csv(
    file: UploadFile = File(...),
    db_key: str = "primary",
    collection_name: str = "uploaded_data",
    auto_vectorize: bool = False
):
    """Upload CSV to specific database"""
    try:
        db_instance = databases.get(db_key)
        if db_instance is None:
            raise HTTPException(status_code=404, detail=f"Database '{db_key}' not found")
        
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        records = df.to_dict('records')
        
        for record in records:
            record['_upload_timestamp'] = datetime.utcnow()
            record['_source_file'] = file.filename
            record['_db_key'] = db_key
        
        collection = db_instance[collection_name]
        result = await collection.insert_many(records)
        
        response_data = {
            "status": "success",
            "db_key": db_key,
            "collection": collection_name,
            "records_inserted": len(result.inserted_ids),
            "columns": list(df.columns),
            "sample": records[:3]
        }
        
        if auto_vectorize:
            text_columns = [col for col in df.columns if df[col].dtype == 'object']
            if text_columns:
                vectorize_request = SmartVectorizeRequest(
                    db_key=db_key,
                    collection_name=collection_name,
                    text_fields=text_columns[:3]
                )
                vectorize_result = await smart_vectorize(vectorize_request)
                response_data['vectorization'] = vectorize_result
        
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload/json")
async def upload_json(
    file: UploadFile = File(...),
    db_key: str = "primary",
    collection_name: str = "uploaded_data",
    auto_vectorize: bool = False
):
    """Upload JSON to specific database"""
    try:
        db_instance = databases.get(db_key)
        if db_instance is None:
            raise HTTPException(status_code=404, detail=f"Database '{db_key}' not found")
        
        contents = await file.read()
        data = json.loads(contents)
        
        if isinstance(data, dict):
            data = [data]
        
        for record in data:
            record['_upload_timestamp'] = datetime.utcnow()
            record['_source_file'] = file.filename
            record['_db_key'] = db_key
        
        collection = db_instance[collection_name]
        result = await collection.insert_many(data)
        
        response_data = {
            "status": "success",
            "db_key": db_key,
            "collection": collection_name,
            "records_inserted": len(result.inserted_ids),
            "sample": data[:3]
        }
        
        if auto_vectorize and data:
            text_fields = [k for k, v in data[0].items() if isinstance(v, str)]
            if text_fields:
                vectorize_request = SmartVectorizeRequest(
                    db_key=db_key,
                    collection_name=collection_name,
                    text_fields=text_fields[:3]
                )
                vectorize_result = await smart_vectorize(vectorize_request)
                response_data['vectorization'] = vectorize_result
        
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= EXPORT ENDPOINTS =============
@app.get("/export/csv/{db_key}/{collection_name}")
async def export_to_csv(db_key: str, collection_name: str, limit: int = 1000):
    """Export collection to CSV"""
    try:
        db_instance = databases.get(db_key)
        if db_instance is None:
            raise HTTPException(status_code=404, detail=f"Database '{db_key}' not found")
        
        collection = db_instance[collection_name]
        documents = await collection.find().limit(limit).to_list(limit)
        
        if not documents:
            raise HTTPException(status_code=404, detail="No data to export")
        
        serialized_docs = [serialize_document(doc) for doc in documents]
        df = pd.DataFrame(serialized_docs)
        
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={db_key}_{collection_name}.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/json/{db_key}/{collection_name}")
async def export_to_json(db_key: str, collection_name: str, limit: int = 1000):
    """Export collection to JSON"""
    try:
        db_instance = databases.get(db_key)
        if db_instance is None:
            raise HTTPException(status_code=404, detail=f"Database '{db_key}' not found")
        
        collection = db_instance[collection_name]
        documents = await collection.find().limit(limit).to_list(limit)
        
        if not documents:
            raise HTTPException(status_code=404, detail="No data to export")
        
        serialized_docs = [serialize_document(doc) for doc in documents]
        
        return StreamingResponse(
            iter([json.dumps(serialized_docs, indent=2)]),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={db_key}_{collection_name}.json"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= SNAPSHOTS =============
@app.post("/vectors/snapshot")
async def create_snapshot():
    """Create a snapshot of the vector collection"""
    try:
        snapshot_info = qdrant_client.create_snapshot(
            collection_name=QDRANT_COLLECTION_NAME
        )
        
        return {
            "status": "snapshot_created",
            "snapshot_name": snapshot_info.name,
            "creation_time": snapshot_info.creation_time,
            "size": snapshot_info.size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vectors/list-snapshots")
async def list_snapshots():
    """List all available snapshots"""
    try:
        snapshots = qdrant_client.list_snapshots(
            collection_name=QDRANT_COLLECTION_NAME
        )
        
        return {
            "snapshots": [
                {
                    "name": snap.name,
                    "creation_time": snap.creation_time,
                    "size": snap.size
                }
                for snap in snapshots
            ],
            "total_snapshots": len(snapshots)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= RUN SERVER =============
if __name__ == "__main__":
    import uvicorn
    print("""
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║     Synapse DB API - Multi-Database Edition          ║
    ║     Smart Vectorization & Lifecycle Management       ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000)
