#!/usr/bin/env python3
"""
Quick-start script for RAG Pipeline
Automates: Download PDFs → Initialize Vector Store → Start API Server
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def print_header(title):
    """Print formatted header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60 + "\n")

def check_ollama():
    """Check if Ollama is running"""
    print("🔍 Checking Ollama connection...")
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        if response.status_code == 200:
            print("✓ Ollama is running")
            models = response.json().get("models", [])
            print(f"  Available models: {len(models)}")
            for model in models[:3]:
                print(f"    - {model['name']}")
            return True
    except Exception as e:
        print(f"✗ Ollama not responding: {e}")
        print("\n  Start Ollama with:")
        print("  $ ollama serve")
        return False

def pull_ollama_model(model="mistral"):
    """Pull Ollama model if not present"""
    print(f"\n📥 Ensuring model '{model}' is available...")
    try:
        result = subprocess.run(
            ["ollama", "pull", model],
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode == 0:
            print(f"✓ Model '{model}' ready")
            return True
        else:
            print(f"✗ Failed to pull model: {result.stderr}")
            return False
    except FileNotFoundError:
        print("✗ Ollama CLI not found in PATH")
        return False

def download_pdfs():
    """Download PDFs using links_to_pdf.py"""
    print_header("Step 1: Download PDFs")
    
    script_path = Path("src/aiagentrag/links_to_pdf.py")
    if not script_path.exists():
        print(f"✗ Script not found: {script_path}")
        return False
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path), "--concurrency", "2", "--browser", "auto"],
            timeout=600
        )
        if result.returncode == 0:
            print("✓ PDFs downloaded successfully")
            return True
        else:
            print("✗ PDF download failed")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def initialize_vector_store():
    """Initialize Chroma vector store"""
    print_header("Step 2: Initialize Vector Store")
    
    init_code = """
import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / 'src/aiagentrag'))

from rag_pipeline import LocalRAGPipeline, RAGConfig

config = RAGConfig(
    pdf_folder='src/aiagentrag/pdfs',
    chroma_path='src/aiagentrag/chroma_db',
    ollama_model='mistral'
)

pipeline = LocalRAGPipeline(config)
if pipeline.initialize():
    print('✓ Vector store initialized successfully')
    print(f'  Chunks stored: {pipeline.vector_store.collection.count()}')
else:
    print('✗ Vector store initialization failed')
    sys.exit(1)
"""
    
    try:
        result = subprocess.run(
            [sys.executable, "-c", init_code],
            timeout=600,
            cwd=Path.cwd()
        )
        return result.returncode == 0
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def start_api_server():
    """Start FastAPI server"""
    print_header("Step 3: Start RAG API Server")
    
    script_path = Path("src/aiagentrag/rag_unified.py")
    if not script_path.exists():
        print(f"✗ Script not found: {script_path}")
        return False
    
    print(f"Starting server...")
    print(f"  Listen: http://localhost:5001")
    print(f"  Press Ctrl+C to stop\n")
    
    try:
        subprocess.run(
            [sys.executable, str(script_path)],
            cwd=Path.cwd()
        )
        return True
    except KeyboardInterrupt:
        print("\n✓ Server stopped")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    """Main setup flow"""
    print("\n" + "="*60)
    print("  🚀 RAG Pipeline Quick Start")
    print("="*60)
    
    # Check prerequisites
    print_header("Prerequisites Check")
    
    if not check_ollama():
        print("\n❌ Ollama is not running. Please start it first:")
        print("   $ ollama serve")
        return
    
    model = "mistral"
    if not pull_ollama_model(model):
        print(f"\n❌ Failed to ensure Ollama model '{model}'")
        return
    
    # Install Python dependencies
    print_header("Python Dependencies")
    print("Installing requirements...")
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q", "-r", "src/aiagentrag/requirements.txt"],
            timeout=300
        )
        if result.returncode == 0:
            print("✓ Dependencies installed")
        else:
            print("⚠ Some dependencies may have failed to install")
    except Exception as e:
        print(f"⚠ Error installing dependencies: {e}")
    
    # Setup steps
    steps = [
        ("Download PDFs", download_pdfs),
        ("Initialize Vector Store", initialize_vector_store),
        ("Start API Server", start_api_server)
    ]
    
    for step_name, step_func in steps:
        if not step_func():
            print(f"\n❌ Setup failed at: {step_name}")
            print("\nFor manual setup, see: src/aiagentrag/RAG_SETUP.md")
            return
        time.sleep(1)
    
    print_header("✓ Setup Complete!")
    print("\n📚 Next Steps:")
    print("  1. Open another terminal")
    print("  2. Import RAGChatbot component in your React app")
    print("  3. Test with: curl http://localhost:5001/health")
    print("\n📖 Documentation: src/aiagentrag/RAG_SETUP.md")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSetup cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
