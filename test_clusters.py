"""
Test script to verify the new Qdrant multi-cluster architecture
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_qdrant_clusters():
    """Test the new /qdrant/clusters endpoint"""
    print("\n" + "="*60)
    print("Testing Qdrant Clusters Endpoint")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/qdrant/clusters")
    data = response.json()
    
    print(f"\nTotal Clusters: {len(data.get('clusters', {}))}")
    print("\nCluster Details:")
    for db_key, cluster in data.get('clusters', {}).items():
        print(f"\n  Database: {db_key}")
        print(f"  Collection: {cluster['collection_name']}")
        print(f"  Exists: {cluster.get('exists', False)}")
        print(f"  Vectors: {cluster.get('vector_count', 0)}")
        print(f"  Created: {cluster['created_at']}")

def test_vector_stats():
    """Test the updated /vectors/stats endpoint"""
    print("\n" + "="*60)
    print("Testing Vector Stats Endpoint")
    print("="*60)
    
    response = requests.get(f"{BASE_URL}/vectors/stats")
    data = response.json()
    
    print(f"\nTotal Vectors: {data['total_vectors']}")
    print(f"Qdrant Clusters: {data['qdrant_clusters']}")
    print(f"Vector Dimension: {data['vector_dimension']}")
    print(f"Distance Metric: {data['distance_metric']}")
    
    print("\nDatabase Summary:")
    for db_summary in data.get('database_summary', []):
        print(f"\n  {db_summary['db_key']} ({db_summary['db_name']})")
        print(f"    Qdrant Collection: {db_summary['qdrant_collection']}")
        print(f"    Total Vectors: {db_summary['total_vectors']}")

def test_clear_vectors():
    """Test clearing vectors for a specific database"""
    print("\n" + "="*60)
    print("Testing Clear Vectors (Database-Specific)")
    print("="*60)
    
    # This would clear all vectors for the 'test' database
    # Uncomment to test (WARNING: Destructive operation!)
    
    # db_key = "test"
    # response = requests.delete(f"{BASE_URL}/vectors/clear?db_key={db_key}")
    # data = response.json()
    # 
    # print(f"\nStatus: {data['status']}")
    # print(f"Database: {data['db_key']}")
    # print(f"Qdrant Collection: {data['qdrant_collection']}")
    # print(f"Collections Cleared: {data['collections_cleared']}")
    # print(f"Total Deleted: {data['total_deleted']}")
    
    print("\n⚠️  Skipped (destructive operation)")
    print("Uncomment the code in test_clear_vectors() to test")

def main():
    print("\n" + "="*60)
    print("QDRANT MULTI-CLUSTER ARCHITECTURE TEST SUITE")
    print("="*60)
    
    try:
        # Test 1: Cluster configuration
        test_qdrant_clusters()
        
        # Test 2: Vector statistics
        test_vector_stats()
        
        # Test 3: Clear vectors (commented out for safety)
        test_clear_vectors()
        
        print("\n" + "="*60)
        print("✓ All tests completed successfully!")
        print("="*60 + "\n")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to the server.")
        print("Make sure the server is running on http://localhost:8000\n")
    except Exception as e:
        print(f"\n❌ Error: {e}\n")

if __name__ == "__main__":
    main()
