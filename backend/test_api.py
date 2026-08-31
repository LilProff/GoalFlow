from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Test health
print("Testing health endpoint...")
resp = client.get("/health")
print(f"Health: {resp.status_code} - {resp.json()}")

# Test signup
print("\nTesting signup...")
try:
    resp = client.post("/auth/signup", json={
        "email": "testuser@example.com",
        "password": "Test123!",
        "name": "Test User"
    })
    print(f"Signup: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")