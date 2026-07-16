#!/usr/bin/env python3
"""
Diagnostic script to test RAG backend and identify errors
Run this to see exactly what's failing
"""

import requests
import json
import time
from pathlib import Path

API_URL = "http://localhost:8000"

def test_health():
    """Test if backend is running"""
    print("\n" + "="*60)
    print("1️⃣  Testing Health Endpoint")
    print("="*60)
    
    try:
        resp = requests.get(f"{API_URL}/health", timeout=5)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.json()}")
        
        if resp.status_code == 200:
            print("✅ Backend is running!")
            return True
        else:
            print("❌ Backend returned bad status")
            return False
    except Exception as e:
        print(f"❌ Cannot reach backend: {e}")
        return False

def test_cors():
    """Test CORS endpoint"""
    print("\n" + "="*60)
    print("2️⃣  Testing CORS")
    print("="*60)
    
    try:
        resp = requests.get(f"{API_URL}/cors-test", timeout=5)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.json()}")
        
        if resp.status_code == 200:
            print("✅ CORS is working!")
            return True
        else:
            print("❌ CORS test failed")
            return False
    except Exception as e:
        print(f"❌ CORS test error: {e}")
        return False

def test_greeting():
    """Test greeting query (should work)"""
    print("\n" + "="*60)
    print("3️⃣  Testing Greeting Query")
    print("="*60)
    
    try:
        data = {"query": "hello"}
        resp = requests.post(f"{API_URL}/query", json=data, timeout=10)
        
        print(f"Status: {resp.status_code}")
        print(f"Response: {json.dumps(resp.json(), indent=2)}")
        
        if resp.status_code == 200:
            print("✅ Greeting query works!")
            return True
        else:
            print(f"❌ Greeting query failed with status {resp.status_code}")
            print(f"Error: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Greeting query error: {e}")
        return False

def test_search_query():
    """Test search query (might fail)"""
    print("\n" + "="*60)
    print("4️⃣  Testing Search Query")
    print("="*60)
    
    try:
        data = {"query": "What is autism?"}
        print(f"Sending query: {data['query']}")
        
        resp = requests.post(f"{API_URL}/query", json=data, timeout=30)
        
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 200:
            result = resp.json()
            print(f"Response preview: {json.dumps(result, indent=2)[:500]}...")
            print("✅ Search query works!")
            return True
        else:
            print(f"❌ Search query failed with status {resp.status_code}")
            print(f"Error details:")
            try:
                print(json.dumps(resp.json(), indent=2))
            except:
                print(f"Raw response: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Search query error: {e}")
        return False

def main():
    print("\n🔍 RAG Backend Diagnostic Tool")
    print("This will test each component to find the issue\n")
    
    # Check if backend is running first
    if not test_health():
        print("\n❌ FATAL: Backend is not running!")
        print("Start it with: python src/aiagentrag/rag_unified.py")
        return
    
    # Run all tests
    results = {
        "Health": test_health(),
        "CORS": test_cors(),
        "Greeting": test_greeting(),
        "Search": test_search_query(),
    }
    
    # Summary
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:20} {status}")
    
    print("\n" + "="*60)
    if results["Search"]:
        print("🎉 Everything works! Backend is ready to use!")
    elif results["Greeting"]:
        print("⚠️  Greeting works but search queries fail")
        print("Check backend terminal logs for the actual error")
        print("The error message should tell you exactly what's wrong")
    else:
        print("❌ Multiple components failing")
        print("Check:")
        print("  1. GROQ_API_KEY in src/aiagentrag/.env")
        print("  2. Backend terminal for error messages")
        print("  3. PDFs folder exists at src/aiagentrag/pdfs/")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
