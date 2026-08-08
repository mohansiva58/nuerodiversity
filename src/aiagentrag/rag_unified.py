#!/usr/bin/env python3
"""
Unified RAG Agent - Single File, Production Ready
- Parent-focused responses
- Ultra-fast Groq API (2-5 sec/query)
- Smart greeting handling (<100ms)
- Query caching
- Complete CLI and API in one file

Usage:
  python rag_unified.py              # Start API on :8000
  python rag_unified.py --test       # Run performance tests
  python rag_unified.py --cli        # Interactive CLI mode
"""

import os
import sys
import json
import logging
import hashlib
import asyncio
import argparse
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import re
import time

# Environment setup
os.environ['HF_HOME'] = str(Path.home() / '.cache' / 'huggingface')
os.environ['SENTENCE_TRANSFORMERS_HOME'] = str(Path.home() / '.cache' / 'sentence-transformers')
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

# Load .env
from dotenv import load_dotenv
env_path = Path(__file__).parents[2] / ".env" if Path(__file__).parents[2].name == "NUEROHUB" else Path(".env")
if env_path.exists():
    load_dotenv(env_path)

import numpy as np
from tqdm import tqdm
import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
try:
    import groq
except ImportError:
    groq = None
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import uvicorn
import urllib.request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Config:
    """Single configuration for entire system"""
    pdf_folder: str = "pdfs"
    chroma_path: str = "chroma_db"
    chunk_size: int = 600
    chunk_overlap: int = 80
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_provider: str = "huggingface"  # "huggingface", "cohere", or "openai"
    llm_provider: str = "ollama"  # "ollama" or "groq"
    ollama_model: str = "mistral"
    ollama_base_url: str = "http://localhost:11434"
    groq_model: str = "llama-3.1-8b-instant"
    top_k_retrieval: int = 7
    temperature: float = 0.4
    max_tokens: int = 400
    port: int = 8000
    host: str = "0.0.0.0"
    
    def __post_init__(self):
        if not Path(self.pdf_folder).is_absolute():
            self.pdf_folder = str(Path(__file__).parent / self.pdf_folder)
        if not Path(self.chroma_path).is_absolute():
            self.chroma_path = str(Path(__file__).parent / self.chroma_path)


SYSTEM_PROMPT = """You are a parent support assistant for NeuroHub.

⚠️ CRITICAL RULES:
1. ONLY answer questions based on the provided documents/context below
2. DO NOT use your training data or general knowledge
3. If the answer is NOT in the provided context, say: "I don't have information about that in our resources"
4. Always cite the source document when providing information
5. Use simple, parent-friendly language
6. Explain concepts for parents (non-technical)
7. Be supportive and encouraging

If you cannot answer from the provided context, explicitly say so. Do NOT make up answers."""

GREETINGS = {
    "hi": "Hello! 👋 I'm here to help. What can I do?",
    "hello": "Hi there! 👋 How can I assist you?",
    "hey": "Hey! 👋 What would you like to know?",
    "thanks": "You're welcome! 😊 Need anything else?",
    "thank you": "Very welcome! 😊 Let me know if you need more.",
    "ok": "Great! What else can I help with?",
    "okay": "Perfect! Anything else?",
    "yes": "Wonderful! What else?",
    "no": "No problem! Ask when ready.",
    "help": "I'm here to help! 💪 What do you need?",
}

INTRODUCTION_PATTERNS = [
    re.compile(r"^i\s+am\s+(?P<name>[a-zA-Z][a-zA-Z\s'-]{0,40})$", re.IGNORECASE),
    re.compile(r"^my\s+name\s+is\s+(?P<name>[a-zA-Z][a-zA-Z\s'-]{0,40})$", re.IGNORECASE),
]


# ═══════════════════════════════════════════════════════════════════════════════
# Core Components (Optimized)
# ═══════════════════════════════════════════════════════════════════════════════

class QueryIntelligence:
    """Analyze queries efficiently"""
    
    @staticmethod
    def is_greeting(query: str) -> bool:
        return query.lower().strip() in GREETINGS
    
    @staticmethod
    def get_greeting(query: str) -> Optional[str]:
        return GREETINGS.get(query.lower().strip())

    @staticmethod
    def is_introduction(query: str) -> bool:
        normalized = query.strip()
        return any(pattern.match(normalized) for pattern in INTRODUCTION_PATTERNS)

    @staticmethod
    def get_introduction_response(query: str) -> Optional[str]:
        normalized = query.strip()
        for pattern in INTRODUCTION_PATTERNS:
            match = pattern.match(normalized)
            if match:
                name = match.group("name").strip().title()
                return f"Nice to meet you, {name}! How can I help today?"
        return None
    
    @staticmethod
    def needs_search(query: str) -> bool:
        """ALL non-greeting queries require document search"""
        if QueryIntelligence.is_greeting(query):
            return False
        # For RAG, ALWAYS search documents for any real query
        # The idea is to force context retrieval for all substantive questions
        return True


class PDFProcessor:
    """Load and process PDFs"""
    
    def __init__(self, pdf_folder: str):
        self.pdf_folder = Path(pdf_folder)
    
    def load_all(self) -> List[Tuple[str, str]]:
        if not self.pdf_folder.exists():
            logger.warning(f"⚠️ PDF folder not found: {self.pdf_folder}")
            return []
        
        documents = []
        for pdf_file in tqdm(self.pdf_folder.glob("*.pdf"), desc="Loading PDFs"):
            text = self._extract(str(pdf_file))
            if text:
                documents.append((pdf_file.name, text))
        
        return documents
    
    def _extract(self, pdf_path: str) -> str:
        try:
            reader = pypdf.PdfReader(pdf_path)
            text = ""
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- Page {i + 1} ---\n{page_text}"
            
            text = re.sub(r'\s+', ' ', text)
            text = ''.join(ch for ch in text if ord(ch) >= 32 or ch in '\n\t')
            return text.strip()
        except Exception as e:
            logger.error(f"Error reading {pdf_path}: {e}")
            return ""


class DocumentChunker:
    """Chunk documents efficiently"""
    
    def __init__(self, chunk_size: int, chunk_overlap: int):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    
    def chunk(self, documents: List[Tuple[str, str]]) -> List[Dict[str, Any]]:
        chunks = []
        for doc_name, text in documents:
            for i, chunk in enumerate(self.splitter.split_text(text)):
                chunks.append({
                    "content": chunk,
                    "source": doc_name,
                    "chunk_id": i
                })
        return chunks


class EmbeddingEngine:
    """Generate embeddings - local or cloud providers for speed"""
    
    def __init__(self, model: str, provider: str = "huggingface"):
        self.provider = provider
        self.model = model
        
        if provider == "cohere":
            try:
                import cohere
                api_key = os.getenv("COHERE_API_KEY")
                if not api_key:
                    raise ValueError("❌ COHERE_API_KEY not set. Get free key: https://dashboard.cohere.com/")
                self.client = cohere.Client(api_key=api_key)
                logger.info(f"✓ Cohere embeddings ready (FAST ~50ms/query)")
            except ImportError:
                logger.error("Missing cohere: pip install cohere")
                raise
        elif provider == "openai":
            try:
                from openai import OpenAI
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("❌ OPENAI_API_KEY not set. Get key: https://platform.openai.com/api-keys")
                self.client = OpenAI(api_key=api_key)
                logger.info(f"✓ OpenAI embeddings ready (FAST ~100ms/query)")
            except ImportError:
                logger.error("Missing openai: pip install openai")
                raise
        else:  # huggingface (default, local but slower)
            logger.info(f"🔄 Loading embeddings: {model}")
            from langchain_huggingface import HuggingFaceEmbeddings
            self.embedder = HuggingFaceEmbeddings(
                model_name=model,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
                cache_folder=os.path.expanduser("~/.cache/huggingface/hub")
            )
            logger.info("✓ HuggingFace embeddings ready (LOCAL, ~500-1000ms/query)")
    
    def embed_many(self, texts: List[str]) -> np.ndarray:
        if self.provider == "cohere":
            response = self.client.embed(texts=texts, model=self.model, input_type="search_document")
            return np.array(response.embeddings)
        elif self.provider == "openai":
            embeddings = []
            for text in texts:
                response = self.client.embeddings.create(model="text-embedding-3-small", input=text)
                embeddings.append(response.data[0].embedding)
            return np.array(embeddings)
        else:
            return np.array(self.embedder.embed_documents(texts))
    
    def embed_one(self, text: str) -> np.ndarray:
        if self.provider == "cohere":
            response = self.client.embed(texts=[text], model=self.model, input_type="search_query")
            return np.array(response.embeddings[0])
        elif self.provider == "openai":
            response = self.client.embeddings.create(model="text-embedding-3-small", input=text)
            return np.array(response.data[0].embedding)
        else:
            result = self.embedder.embed_query(text)
            return np.array(result) if not isinstance(result, np.ndarray) else result


class VectorStore:
    """Chroma vector store with batch operations"""
    
    def __init__(self, chroma_path: str):
        self.db_path = Path(chroma_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
        self.client = None
        self.collection = None
        self.fallback_chunks: List[Dict[str, Any]] = []
        self.fallback_embeddings: Optional[np.ndarray] = None

        try:
            import chromadb

            self.client = chromadb.PersistentClient(path=str(self.db_path))
            logger.info("✓ Chroma vector store ready")
        except Exception as e:
            logger.warning(f"⚠️ Chroma unavailable, using in-memory vector store: {e}")
            self.client = None
    
    def initialize(self, chunks: List[Dict[str, Any]], embeddings: np.ndarray):
        if self.client is None:
            self.fallback_chunks = chunks
            self.fallback_embeddings = embeddings
            logger.info(f"✓ Stored {len(chunks)} chunks in memory")
            return

        try:
            self.client.delete_collection("documents")
        except:
            pass
        
        self.collection = self.client.create_collection("documents")
        
        for i in tqdm(range(0, len(chunks), 100), desc="Storing embeddings"):
            batch_end = min(i + 100, len(chunks))
            batch = chunks[i:batch_end]
            batch_emb = embeddings[i:batch_end]
            
            self.collection.add(
                ids=[f"doc_{j}" for j in range(i, batch_end)],
                embeddings=batch_emb.tolist(),
                documents=[c["content"] for c in batch],
                metadatas=[{"source": c["source"], "chunk_id": c["chunk_id"]} for c in batch]
            )
        
        logger.info(f"✓ Stored {len(chunks)} chunks")
    
    def search(self, embedding, top_k: int):
        if self.client is None:
            if self.fallback_embeddings is None or not len(self.fallback_chunks):
                return []

            query_vec = embedding if isinstance(embedding, list) else (embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding))
            stored = self.fallback_embeddings
            if not isinstance(stored, np.ndarray):
                stored = np.array(stored)

            norms = np.linalg.norm(stored, axis=1) * np.linalg.norm(np.array(query_vec))
            similarities = np.dot(stored, query_vec) / np.where(norms == 0, 1, norms)
            ranked_indices = np.argsort(similarities)[::-1][:top_k]

            retrieved = []
            for index in ranked_indices:
                chunk = self.fallback_chunks[int(index)]
                retrieved.append({
                    "content": chunk["content"],
                    "source": chunk["source"]
                })
            return retrieved

        if self.collection is None:
            return []
        
        # Handle both numpy arrays and lists
        if isinstance(embedding, np.ndarray):
            embedding_list = embedding.tolist()
        elif isinstance(embedding, list):
            embedding_list = embedding
        else:
            embedding_list = list(embedding)
        
        results = self.collection.query(query_embeddings=[embedding_list], n_results=top_k)
        
        retrieved = []
        if results['documents'] and results['documents'][0]:
            for i, doc in enumerate(results['documents'][0]):
                retrieved.append({
                    "content": doc,
                    "source": results['metadatas'][0][i].get("source", "Unknown")
                })
        
        return retrieved


class LLMGenerator:
    """Local Ollama generation by default, Groq as optional fallback"""
    
    def __init__(self, model: str, temperature: float, max_tokens: int, provider: str = "ollama", base_url: str = "http://localhost:11434"):
        self.provider = provider.lower().strip()
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.base_url = base_url.rstrip("/")

        if self.provider == "groq":
            if groq is None:
                raise ValueError("❌ groq package not installed. Install dependencies or switch to OLLAMA.")

            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError(
                    "❌ GROQ_API_KEY not found!\n"
                    "Get a free API key from: https://console.groq.com\n"
                    "Then add to src/aiagentrag/.env:\n"
                    "  GROQ_API_KEY=your_key_here\n"
                    "Then restart the server."
                )

            self.client = groq.Groq(api_key=api_key)
            logger.info(f"✓ Groq ready ({model})")
        else:
            self.client = None
            logger.info(f"✓ Ollama ready ({model} at {self.base_url})")
    
    def generate(self, query: str, context: str = "") -> str:
        # STRICT: Require context for proper RAG
        if not context or context.strip() == "":
            raise ValueError(
                "❌ No document context retrieved. "
                "This question cannot be answered from available resources. "
                "Please ensure PDFs are loaded in the 'pdfs' folder."
            )
        
        # Format context with clear source markers
        formatted_context = f"""📚 REFERENCE DOCUMENTS:\n{context}\n\n⚠️ BASE YOUR ANSWER ONLY ON THE ABOVE CONTENT. DO NOT USE GENERAL KNOWLEDGE."""
        
        prompt = f"""{formatted_context}

📝 PARENT QUESTION: {query}

📖 ANSWER (Use simple parent-friendly language):"""

        if self.provider == "groq":
            message = self.client.chat.completions.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature
            )

            answer = message.choices[0].message.content.strip()
        else:
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "options": {
                    "temperature": self.temperature,
                    "num_predict": self.max_tokens,
                },
            }
            request = urllib.request.Request(
                f"{self.base_url}/api/chat",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=120) as response:
                response_payload = json.loads(response.read().decode("utf-8"))
            answer = response_payload["message"]["content"].strip()
        
        # Validate that answer actually references the context
        # (simple check - real model should follow instructions)
        if "don't have" in answer.lower() or "not in our resources" in answer.lower():
            logger.info("✓ Model correctly refused to answer outside of context")
        
        return answer


class ResponseCache:
    """Smart caching with TTL"""
    
    def __init__(self, ttl_minutes: int = 120):
        self.cache = {}
        self.ttl = ttl_minutes * 60
    
    def get_key(self, query: str) -> str:
        normalized = query.lower().strip().replace("?", "").replace("!", "")
        return hashlib.md5(normalized.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Dict]:
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        if time.time() > entry['expires_at']:
            del self.cache[key]
            return None
        
        return entry['data']
    
    def set(self, key: str, data: Dict):
        self.cache[key] = {
            'data': data,
            'expires_at': time.time() + self.ttl
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Main RAG Agent
# ═══════════════════════════════════════════════════════════════════════════════

class RAGAgent:
    """Unified RAG Agent - all features in one"""
    
    def __init__(self, config: Config):
        self.config = config
        self.pdf_processor = PDFProcessor(config.pdf_folder)
        self.chunker = DocumentChunker(config.chunk_size, config.chunk_overlap)
        self.embeddings = EmbeddingEngine(config.embedding_model, config.embedding_provider)
        self.vector_store = VectorStore(config.chroma_path)
        model = config.ollama_model if config.llm_provider == "ollama" else config.groq_model
        self.llm = LLMGenerator(model, config.temperature, config.max_tokens, config.llm_provider, config.ollama_base_url)
        self.cache = ResponseCache()
        self.initialized = False
    
    def initialize(self):
        if self.initialized:
            return
        
        logger.info("🚀 Initializing RAGAgent...")
        start = datetime.now()
        
        documents = self.pdf_processor.load_all()
        if documents:
            chunks = self.chunker.chunk(documents)
            texts = [c["content"] for c in chunks]
            embeddings = self.embeddings.embed_many(texts)
            self.vector_store.initialize(chunks, embeddings)
        
        elapsed = (datetime.now() - start).total_seconds()
        logger.info(f"✅ Initialized in {elapsed:.1f}s")
        self.initialized = True
    
    def query(self, question: str) -> Dict[str, Any]:
        if not self.initialized:
            self.initialize()
        
        start = datetime.now()
        
        # Check cache
        cache_key = self.cache.get_key(question)
        cached = self.cache.get(cache_key)
        if cached:
            cached['from_cache'] = True
            return cached
        
        # Handle greeting
        if QueryIntelligence.is_greeting(question):
            elapsed = (datetime.now() - start).total_seconds() * 1000
            result = {
                "query": question,
                "answer": QueryIntelligence.get_greeting(question),
                "sources": [],
                "processing_time_ms": elapsed,
                "query_type": "greeting",
                "from_cache": False
            }
            self.cache.set(cache_key, result)
            return result

        if QueryIntelligence.is_introduction(question):
            elapsed = (datetime.now() - start).total_seconds() * 1000
            result = {
                "query": question,
                "answer": QueryIntelligence.get_introduction_response(question),
                "sources": [],
                "processing_time_ms": elapsed,
                "query_type": "introduction",
                "from_cache": False
            }
            self.cache.set(cache_key, result)
            return result
        
        # Determine if search needed
        needs_search = QueryIntelligence.needs_search(question)
        sources = []
        context = ""
        query_type = "general"
        
        try:
            if needs_search:
                logger.info(f"🔍 Embedding query: {question[:50]}...")
                embedding = self.embeddings.embed_one(question)
                logger.info(f"✓ Query embedded")
                
                logger.info(f"🔍 Searching vector store (retrieving top {self.config.top_k_retrieval} documents)...")
                sources = self.vector_store.search(embedding, self.config.top_k_retrieval)
                logger.info(f"✓ Found {len(sources)} relevant sources")
                
                if sources:
                    context = "\n\n".join([f"[Source: {s['source']}]\n{s['content']}" for s in sources])
                    logger.info(f"✓ Context assembled from {len(sources)} documents")
                else:
                    logger.warning(f"⚠️  No relevant documents found for: {question[:50]}...")
                    context = ""
                
                query_type = "search"
            else:
                logger.info(f"ℹ️ Greeting detected - no document search needed")
        except Exception as e:
            logger.error(f"❌ Search/embedding error: {e}", exc_info=True)
            # Continue without search on error
            sources = []
            context = ""
            query_type = "general_error"
        
        try:
            logger.info(f"🤖 Generating answer with Groq...")
            answer = self.llm.generate(question, context)
            logger.info(f"✓ Answer generated")
        except Exception as e:
            logger.error(f"❌ LLM generation error: {e}", exc_info=True)
            raise Exception(f"Failed to generate answer: {str(e)}")
        
        elapsed = (datetime.now() - start).total_seconds() * 1000
        
        result = {
            "query": question,
            "answer": answer,
            "sources": sources,
            "processing_time_ms": elapsed,
            "query_type": query_type,
            "from_cache": False
        }
        
        self.cache.set(cache_key, result)
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# FastAPI Application
# ═══════════════════════════════════════════════════════════════════════════════

# Global agent
agent: Optional[RAGAgent] = None
initialized = False
runtime_config: Optional[Config] = None


def _build_and_initialize_agent(config: Config) -> RAGAgent:
    built_agent = RAGAgent(config)
    built_agent.initialize()
    return built_agent


async def _warm_agent(config: Config):
    global agent, initialized
    try:
        logger.info("🔄 Warming RAG agent in background...")
        agent = await asyncio.to_thread(_build_and_initialize_agent, config)
        initialized = True
        logger.info("✓ RAG agent warmed and ready")
    except Exception as e:
        logger.error(f"❌ Background RAG warm-up failed: {e}", exc_info=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent, initialized, runtime_config
    logger.info("🚀 RAG Agent API - Starting")
    
    try:
        runtime_config = Config(
            pdf_folder=os.getenv("PDF_FOLDER", "pdfs"),
            chroma_path=os.getenv("CHROMA_PATH", "chroma_db"),
            embedding_provider=os.getenv("EMBEDDING_PROVIDER", "huggingface"),  # "cohere", "openai", or "huggingface"
            llm_provider=os.getenv("LLM_PROVIDER", "ollama"),
            ollama_model=os.getenv("OLLAMA_MODEL", "mistral"),
            ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            groq_model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            max_tokens=int(os.getenv("MAX_TOKENS", "300")),
            temperature=float(os.getenv("TEMPERATURE", "0.3")),
            top_k_retrieval=int(os.getenv("TOP_K", "7")),
            port=int(os.getenv("PORT", "8000"))
        )
        app.state.config = runtime_config
        logger.info("✓ RAG config loaded")
        asyncio.create_task(_warm_agent(runtime_config))
    except Exception as e:
        logger.error(f"❌ {e}")
        raise
    
    yield
    logger.info("🛑 Shutting down")

app = FastAPI(title="Unified RAG Agent", version="1.0.0", lifespan=lifespan)

# CORS Middleware must be added first
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Explicit OPTIONS handler for preflight requests
@app.options("/{full_path:path}")
async def preflight_handler(full_path: str):
    return JSONResponse(
        content={},
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Models
class QueryRequest(BaseModel):
    query: str

class SourceDoc(BaseModel):
    source: str
    content: str

class QueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[SourceDoc]
    processing_time_ms: float
    query_type: str
    from_cache: bool

# Global exception handler for CORS
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={"Access-Control-Allow-Origin": "*"},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"},
    )

# Endpoints
@app.get("/")
async def root():
    return {"name": "Unified RAG Agent", "version": "1.0.0"}


@app.head("/")
async def root_head():
    return JSONResponse(content={}, status_code=200)

@app.get("/health")
async def health():
    return {"status": "ok", "ready": agent is not None}


@app.head("/health")
async def health_head():
    return JSONResponse(content={}, status_code=200)

@app.get("/cors-test")
async def cors_test():
    """Test endpoint to verify CORS is working"""
    return {
        "message": "CORS is working!",
        "status": "✓ Backend is reachable",
        "agent_ready": agent is not None
    }

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest) -> QueryResponse:
    global agent, initialized, runtime_config
    
    try:
        if QueryIntelligence.is_greeting(request.query):
            greeting = QueryIntelligence.get_greeting(request.query)
            elapsed = 0.0
            return QueryResponse(
                query=request.query,
                answer=greeting or "Hello! How can I help?",
                sources=[],
                processing_time_ms=elapsed,
                query_type="greeting",
                from_cache=False
            )

        if QueryIntelligence.is_introduction(request.query):
            introduction = QueryIntelligence.get_introduction_response(request.query)
            return QueryResponse(
                query=request.query,
                answer=introduction or "Nice to meet you! How can I help today?",
                sources=[],
                processing_time_ms=0.0,
                query_type="introduction",
                from_cache=False
            )

        if not initialized:
            return QueryResponse(
                query=request.query,
                answer=(
                    "I'm still loading the document library right now. "
                    "Please try again in a moment, or ask me a greeting while I finish warming up."
                ),
                sources=[],
                processing_time_ms=0.0,
                query_type="warming_up",
                from_cache=False
            )

        if not agent:
            return QueryResponse(
                query=request.query,
                answer=(
                    "I'm almost ready, but the assistant is still initializing. "
                    "Please try again in a moment."
                ),
                sources=[],
                processing_time_ms=0.0,
                query_type="warming_up",
                from_cache=False
            )
        
        logger.info(f"🔍 Processing query: {request.query[:50]}...")
        try:
            result = await asyncio.to_thread(agent.query, request.query.strip())
        except Exception as query_error:
            error_msg = f"Agent query failed: {str(query_error)}"
            logger.error(f"❌ {error_msg}", exc_info=True)
            raise HTTPException(status_code=500, detail=error_msg)
        
        logger.info(f"✓ Query processed in {result['processing_time_ms']}ms")
        
        try:
            # Format sources
            formatted_sources = []
            for s in result.get("sources", []):
                try:
                    source_content = s.get("content", "")
                    if not isinstance(source_content, str):
                        source_content = str(source_content)
                    formatted_sources.append(
                        SourceDoc(
                            source=s.get("source", "Unknown"),
                            content=source_content[:150]
                        )
                    )
                except Exception as src_error:
                    logger.error(f"Error formatting source: {src_error}")
                    # Skip malformed sources
                    continue
            
            return QueryResponse(
                query=result["query"],
                answer=result["answer"],
                sources=formatted_sources,
                processing_time_ms=result["processing_time_ms"],
                query_type=result["query_type"],
                from_cache=result.get("from_cache", False)
            )
        except Exception as format_error:
            logger.error(f"❌ Response formatting error: {format_error}", exc_info=True)
            # Return minimal valid response
            raise HTTPException(
                status_code=500,
                detail=f"Response formatting failed: {str(format_error)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Query endpoint error: {str(e)}"
        logger.error(f"❌ {error_msg}", exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/reinitialize")
async def reinitialize():
    global agent, initialized
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not ready")
    await asyncio.to_thread(agent.initialize)
    initialized = True
    return {"status": "success"}


# ═══════════════════════════════════════════════════════════════════════════════
# CLI Modes
# ═══════════════════════════════════════════════════════════════════════════════

def run_api_server(config: Config):
    """Start API server"""
    logger.info(f"📍 Server: http://localhost:{config.port}")
    logger.info(f"📚 Docs: http://localhost:{config.port}/docs")
    uvicorn.run(app, host=config.host, port=config.port, log_level="info", lifespan="on")

def run_tests(config: Config):
    """Run performance tests"""
    logger.info("🧪 Testing RAG Agent")
    
    agent = RAGAgent(config)
    agent.initialize()
    
    tests = [
        ("hello", "greeting"),
        ("How can I help my child?", "search"),
        ("thanks", "greeting"),
    ]
    
    times = {"greeting": [], "search": [], "general": []}
    
    for query, expected_type in tests:
        logger.info(f"\nQ: {query}")
        result = agent.query(query)
        time_ms = result["processing_time_ms"]
        times[result["query_type"]].append(time_ms)
        logger.info(f"A: {result['answer'][:80]}...")
        logger.info(f"⏱️  {time_ms:.0f}ms ({result['query_type']})")
    
    logger.info("\n" + "="*70)
    for qtype, t in times.items():
        if t:
            logger.info(f"{qtype.upper()}: avg={sum(t)/len(t):.0f}ms, min={min(t):.0f}ms, max={max(t):.0f}ms")

def run_cli(config: Config):
    """Interactive CLI mode"""
    logger.info("🎤 Interactive CLI Mode (type 'quit' to exit)")
    
    agent = RAGAgent(config)
    agent.initialize()
    
    while True:
        try:
            query = input("\n❓ You: ").strip()
            if query.lower() == "quit":
                break
            
            result = agent.query(query)
            print(f"\n💬 Agent: {result['answer']}")
            print(f"⏱️  {result['processing_time_ms']:.0f}ms ({result['query_type']})")
        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.error(f"Error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# Main Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Unified RAG Agent")
    parser.add_argument("--test", action="store_true", help="Run performance tests")
    parser.add_argument("--cli", action="store_true", help="Interactive CLI mode")
    parser.add_argument("--port", type=int, default=8000, help="API port (default: 8000)")
    args = parser.parse_args()
    
    config = Config(port=args.port)
    
    if args.test:
        run_tests(config)
    elif args.cli:
        run_cli(config)
    else:
        run_api_server(config)


if __name__ == "__main__":
    main()
