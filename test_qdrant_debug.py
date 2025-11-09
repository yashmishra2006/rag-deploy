import requests

# Check what's in Qdrant
response = requests.get('http://localhost:8000/debug/qdrant-collections')
data = response.json()

print(f"Total Qdrant collections: {data['total_collections']}")
print()

for coll in data['collections']:
    print(f"Collection: {coll['name']}")
    print(f"  Points: {coll.get('points_count', 'N/A')}")
    if 'sample_payloads' in coll:
        print(f"  Sample payloads:")
        for i, payload in enumerate(coll['sample_payloads'][:2], 1):
            print(f"    {i}. db_key: {payload.get('db_key')}, collection: {payload.get('source_collection')}")
    if 'error' in coll:
        print(f"  ERROR: {coll['error']}")
    print()
