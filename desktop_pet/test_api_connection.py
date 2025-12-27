
import requests
import json

BASE_URL = "http://127.0.0.1:3001"

def test_health():
    url = f"{BASE_URL}/api/health"
    try:
        print(f"Checking health: {url}")
        resp = requests.get(url)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Health check failed: {e}")

def test_start_travel_404():
    # 测试导致 404 的接口
    url = f"{BASE_URL}/api/travels/start"
    data = {"frogId": 1}
    try:
        print(f"\nChecking travel start: {url}")
        resp = requests.post(url, json=data)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Travel start failed: {e}")

if __name__ == "__main__":
    test_health()
    test_start_travel_404()
