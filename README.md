# InsightDB

A hackathon project by Team Byte Builders

## Team Members
- Yash Mishra
- Arkin Kansra

## Overview

InsightDB is an intelligent database query and analytics platform that enables users to interact with their MongoDB databases using natural language. The system leverages advanced AI models to understand user queries, extract relevant information from databases, and generate comprehensive answers with supporting visualizations.

The platform bridges the gap between complex database operations and everyday users by eliminating the need for SQL or NoSQL query knowledge. Users can simply ask questions in plain English, and InsightDB handles the entire pipeline from query understanding to result generation.

## Key Features

- Natural language query interface for MongoDB databases
- Hybrid keyword-semantic search combining LLM intelligence with vector embeddings
- Multi-database support with separate Qdrant vector clusters
- Smart vectorization of MongoDB collections for semantic search
- Real-time query interpretation and answer generation
- Automatic chart and visualization generation from query results
- Vector similarity search using MongoDB Atlas vector search
- Support for multiple MongoDB database connections
- Comprehensive query history and result tracking

## Technology Stack

### Backend
- **FastAPI**: High-performance API framework
- **Python 3.11+**: Core backend language
- **Motor**: Async MongoDB driver for Python
- **MongoDB Atlas**: Cloud database platform with vector search capabilities
- **Qdrant**: Vector database for semantic search
- **Google Gemini 2.0 Flash Lite**: Large language model for query understanding and answer generation
- **Sentence-Transformers (MiniLM-L6-v2)**: Local embedding model for 384-dimensional vector generation
- **Pydantic**: Data validation and settings management

### AI/ML Components
- **Google Generative AI**: LLM for natural language processing
- **all-MiniLM-L6-v2**: Lightweight sentence embedding model
- **Vector Search**: MongoDB Atlas vector search with cosine similarity
- **RAG Pipeline**: Retrieval-Augmented Generation for context-aware responses

### Data Storage
- **MongoDB**: Primary database for document storage
- **Qdrant Cloud**: Vector storage with separate clusters per database
- **JSON Files**: Configuration storage for database connections and Qdrant clusters

## Architecture

The system follows a Retrieval-Augmented Generation (RAG) architecture:

1. **Query Processing**: User submits natural language query
2. **Keyword Extraction**: Gemini extracts 3-5 relevant keywords from query
3. **Vector Embedding**: MiniLM-L6-v2 converts keywords to 384-dimensional vectors
4. **Semantic Search**: MongoDB Atlas vector search or Qdrant finds similar documents
5. **Context Building**: Retrieved documents are compiled into context
6. **Answer Generation**: Gemini generates comprehensive answer from context
7. **Visualization**: Optional chart generation based on retrieved data

## How to Use

### Prerequisites

1. Python 3.11 or higher
2. MongoDB Atlas account with vector search enabled
3. Qdrant Cloud account
4. Google Cloud account with Gemini API access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rag-deploy
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file from the template:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```
GEMINI_API_KEY=your_gemini_api_key_here
QDRANT_URL=your_qdrant_cloud_url_here
QDRANT_API_KEY=your_qdrant_api_key_here
```

5. Set up MongoDB connections in `database_connections.json`:
```json
{
  "databases": [
    {
      "key": "primary",
      "name": "Primary Database",
      "srv": "mongodb+srv://...",
      "db_name": "your_database_name",
      "status": "connected"
    }
  ]
}
```

6. Configure Qdrant clusters in `qdrant_clusters.json`:
```json
{
  "clusters": {
    "primary": "qdrant_collection_name"
  }
}
```

### Running the Application

1. Start the backend server:
```bash
python main.py
```

The server will start on `http://localhost:8000`

2. Open the frontend by opening `index.html` in a web browser

3. Access the API documentation at `http://localhost:8000/docs`

### Vectorizing Collections

Before querying, vectorize your MongoDB collections:

1. Navigate to the Upload page
2. Select your database
3. Choose collections to vectorize
4. Specify text fields for embedding generation
5. Click "Start Vectorization"

The system will:
- Extract text from specified fields
- Chunk documents for optimal embedding
- Generate 384-dimensional vectors using MiniLM
- Store vectors in Qdrant or MongoDB Atlas

### Querying

1. Navigate to the Query page
2. Select the database to query
3. Enter your question in natural language
4. Adjust result limit (5-100 results)
5. Click "Execute Query"

The system will return:
- AI-generated answer
- Source documents with similarity scores
- Search keywords used
- Collections searched
- Optional visualization charts

## Directory Structure

```
rag-deploy/
├── main.py                          # FastAPI backend application
├── requirements.txt                 # Python dependencies
├── .env                            # Environment configuration
├── database_connections.json        # MongoDB connection configs
├── qdrant_clusters.json            # Qdrant cluster mappings
├── index.html                       # Main HTML entry point
├── css/
│   └── styles.css                   # Application styles
├── js/
│   ├── app.js                       # Main application logic
│   ├── api.js                       # API client
│   └── pages/
│       ├── home.js                  # Dashboard page
│       ├── upload.js                # Upload and vectorization
│       ├── query.js                 # Query interface
│       ├── results.js               # Results visualization
│       ├── export.js                # Data export
│       ├── settings.js              # Settings management
│       ├── about.js                 # About page
│       └── docs.js                  # Documentation
└── README.md                        # This file
```

## API Endpoints

### Database Management
- `GET /databases` - List all connected databases
- `POST /databases/connect` - Connect new database
- `DELETE /databases/{db_key}` - Remove database connection
- `GET /collections` - Get collections for a database

### Vectorization
- `POST /vectorize/smart` - Vectorize a collection
- `POST /vectorize/smart/stream` - Streaming vectorization
- `POST /vectorize/sync-all` - Vectorize all collections in database
- `DELETE /vectors/clear-all` - Clear all vectors for database

### Querying
- `POST /query/vector-rag` - Vector RAG query (Qdrant)
- `POST /query/mongodb-vector-search` - MongoDB Atlas vector search
- `POST /query/hybrid-search` - Advanced hybrid search

### Vector Management
- `GET /vectors/stats` - Get vector statistics
- `GET /vectors/collections` - List vectorized collections

## Configuration

### MongoDB Atlas Vector Search

Create a vector search index with the following configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    }
  ]
}
```

### Qdrant Collection

Collections are automatically created with:
- Vector size: 384 dimensions
- Distance metric: Cosine similarity
- Payload indexing enabled

## Performance Considerations

- Embedding generation is performed locally (no API costs)
- Qdrant provides fast vector similarity search
- MongoDB Atlas vector search offers native integration
- Batch processing for large collections
- Configurable chunk sizes for optimal performance
- Score threshold filtering for relevant results

## Limitations

- Requires MongoDB Atlas for vector search functionality
- Gemini API rate limits apply
- Vector search performance depends on collection size
- Maximum 384-dimensional vectors (MiniLM limitation)

## Future Enhancements

- Support for additional embedding models
- Advanced filtering and query refinement
- Multi-modal search capabilities
- Query optimization and caching
- Extended visualization options
- Collaborative query sharing
- Custom embedding model training

## License

This project was developed for hackathon purposes.

## Acknowledgments

- Google Gemini for LLM capabilities
- Sentence-Transformers for embedding models
- Qdrant for vector search infrastructure
- MongoDB Atlas for database and vector search
- FastAPI for the robust backend framework
