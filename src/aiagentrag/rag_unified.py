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

# Load .env (repo root first, then package-local .env fills any missing vars)
from dotenv import load_dotenv
_pkg_dir = Path(__file__).parent
_root_dir = _pkg_dir.parents[1]
for _candidate in (_root_dir / ".env", _pkg_dir / ".env"):
    if _candidate.exists():
        load_dotenv(_candidate)

import numpy as np
from tqdm import tqdm
import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
try:
    import groq
except ImportError:
    groq = None
try:
    import cohere
except ImportError:
    cohere = None
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
    chunk_size: int = 600
    chunk_overlap: int = 80
    embedding_model: str = "embed-english-v3.0"
    embedding_provider: str = "cohere"  # "huggingface", "cohere", or "openai"
    llm_provider: str = "groq"  # "ollama" or "groq"
    ollama_model: str = "mistral"
    ollama_base_url: str = "http://localhost:11434"
    groq_model: str = "llama-3.1-8b-instant"
    top_k_retrieval: int = 7
    temperature: float = 0.4
    max_tokens: int = 400
    port: int = 10000
    host: str = "0.0.0.0"
    
    def __post_init__(self):
        if not Path(self.pdf_folder).is_absolute():
            self.pdf_folder = str(Path(__file__).parent / self.pdf_folder)


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
    
    def __init__(self, model: str, provider: str = "cohere"):
        self.provider = provider
        self.model = model

        if provider == "cohere":
            try:
                if cohere is None:
                    raise ImportError("cohere package is not installed")
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
        else:
            # HuggingFace/BGE is NOT supported for this Supabase-backed RAG.
            # The existing `documents` table stores 1024-dimensional Cohere
            # (embed-english-v3.0) vectors; a local BGE model produces 384-dim
            # embeddings and would silently break retrieval. Fail loudly here
            # instead of falling back at query time.
            raise ValueError(
                f"❌ Unsupported embedding provider: {provider!r}. "
                "The production Supabase 'documents' table stores 1024-dimensional "
                "Cohere (embed-english-v3.0) vectors. HuggingFace/BGE embeddings are "
                "incompatible and must NOT be used. Set EMBEDDING_PROVIDER=cohere "
                "and EMBEDDING_MODEL=embed-english-v3.0."
            )
    
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
    """Supabase pgvector store (read-only in production).

    Documents are ingested OFFLINE into the Supabase `documents` table
    (see ingest_supabase.py). This class only performs vector search via
    the `match_documents` RPC.
    """

    EXPECTED_DIMENSION = 1024  # embed-english-v3.0 / vector(1024) column

    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SECRET_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError(
                "❌ SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the environment. "
                "The production RAG queries the existing Supabase 'documents' table."
            )

        try:
            from supabase import create_client
        except ImportError as e:
            raise RuntimeError(
                "❌ supabase package not installed. Run: pip install -r src/aiagentrag/requirements.txt"
            ) from e

        self.client = create_client(supabase_url, supabase_key)
        logger.info("✓ Supabase vector store ready (match_documents RPC)")

    def initialize(self, chunks: List[Dict[str, Any]], embeddings: np.ndarray):
        """OFFLINE INGESTION ONLY. Never call from the FastAPI startup path.

        Uploads chunk texts + Cohere search_document embeddings to the
        existing Supabase `documents` table in batches.
        """
        if len(chunks) != len(embeddings):
            raise ValueError(f"chunks/embeddings length mismatch: {len(chunks)} vs {len(embeddings)}")

        total = len(chunks)
        for i in tqdm(range(0, total, 100), desc="Uploading to Supabase"):
            batch = chunks[i:i + 100]
            batch_emb = embeddings[i:i + 100]
            rows = []
            for chunk, emb in zip(batch, batch_emb):
                embedding_list = emb.tolist() if isinstance(emb, np.ndarray) else list(emb)
                if len(embedding_list) != self.EXPECTED_DIMENSION:
                    raise ValueError(
                        f"Embedding dimension {len(embedding_list)} != expected {self.EXPECTED_DIMENSION}"
                    )
                rows.append({
                    "content": chunk["content"],
                    "metadata": {"source": chunk.get("source", "Unknown"), "chunk_id": chunk.get("chunk_id")},
                    "embedding": embedding_list,
                })
            self.client.table("documents").insert(rows).execute()

        logger.info(f"✓ Stored {total} chunks in Supabase")

    def search(self, embedding, top_k: int):
        """Query Supabase match_documents RPC with a query embedding."""
        # Normalize NumPy arrays / iterables to a plain list of floats
        if isinstance(embedding, np.ndarray):
            query_embedding = embedding.tolist()
        elif isinstance(embedding, list):
            query_embedding = embedding
        else:
            query_embedding = list(embedding)

        if len(query_embedding) != self.EXPECTED_DIMENSION:
            raise ValueError(
                f"Query embedding has dimension {len(query_embedding)}, "
                f"but the documents table expects vector({self.EXPECTED_DIMENSION}). "
                f"Check EMBEDDING_MODEL/EMBEDDING_PROVIDER configuration."
            )

        try:
            response = (
                self.client.rpc(
                    "match_documents",
                    {
                        "query_embedding": query_embedding,
                        "match_count": top_k,
                    },
                )
                .execute()
            )
        except Exception as e:
            logger.error(f"❌ Supabase match_documents RPC failed: {e}", exc_info=True)
            raise RuntimeError(f"Vector retrieval from Supabase failed: {e}") from e

        data = response.data or []
        if not data:
            logger.warning("⚠️ match_documents returned zero results")

        retrieved = []
        for row in data:
            metadata = row.get("metadata") or {}
            entry = {
                "content": row.get("content", ""),
                "source": row.get("source") or metadata.get("source", "Unknown"),
            }
            if row.get("chunk_id") is not None:
                entry["chunk_id"] = row["chunk_id"]
            elif metadata.get("chunk_id") is not None:
                entry["chunk_id"] = metadata["chunk_id"]
            if row.get("similarity") is not None:
                entry["similarity"] = row["similarity"]
            retrieved.append(entry)

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
        # Offline ingestion utilities (used only by ingest_supabase.py, never at startup)
        self.pdf_processor = PDFProcessor(config.pdf_folder)
        self.chunker = DocumentChunker(config.chunk_size, config.chunk_overlap)
        self.embeddings = EmbeddingEngine(config.embedding_model, config.embedding_provider)
        self.vector_store = VectorStore()
        model = config.ollama_model if config.llm_provider == "ollama" else config.groq_model
        self.llm = LLMGenerator(model, config.temperature, config.max_tokens, config.llm_provider, config.ollama_base_url)
        self.cache = ResponseCache()
        self.initialized = False

    def initialize(self):
        """Lightweight production initialization.

        The document library (1,358 chunks) is ALREADY embedded in Supabase.
        Startup must only validate that the runtime clients are ready —
        NO PDF parsing, NO chunking, NO bulk embedding.
        """
        if self.initialized:
            return

        logger.info("🚀 Initializing RAGAgent (lightweight, Supabase-backed)...")

        if getattr(self.vector_store, "client", None) is None:
            raise RuntimeError("Supabase vector store client is not initialized")

        self.initialized = True
        logger.info("✅ RAGAgent ready (documents served from Supabase)")
    
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
                logger.info(f"✓ Query embedded (dim={len(embedding)})")

                logger.info(f"🔍 Searching Supabase vector store (retrieving top {self.config.top_k_retrieval} documents)...")
                sources = self.vector_store.search(embedding, self.config.top_k_retrieval)
                logger.info(f"✓ Found {len(sources)} relevant sources")

                if sources:
                    context = "\n\n".join([f"[Source: {s['source']}]\n{s['content']}" for s in sources])
                    logger.info(f"✓ Context assembled from {len(sources)} documents")
                else:
                    # Zero retrieval: answer gracefully using the grounded refusal,
                    # consistent with SYSTEM_PROMPT rules. Not a backend failure.
                    logger.warning(f"⚠️  No relevant documents found for: {question[:50]}...")
                    elapsed = (datetime.now() - start).total_seconds() * 1000
                    result = {
                        "query": question,
                        "answer": "I don't have information about that in our resources.",
                        "sources": [],
                        "processing_time_ms": elapsed,
                        "query_type": "no_results",
                        "from_cache": False
                    }
                    self.cache.set(cache_key, result)
                    return result

                query_type = "search"
            else:
                logger.info(f"ℹ️ Greeting detected - no document search needed")
        except Exception as e:
            # Genuine backend failure (Cohere/Supabase) must NOT become a fake answer
            logger.error(f"❌ Search/embedding error: {e}", exc_info=True)
            raise
        
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
startup_error: Optional[str] = None
runtime_config: Optional[Config] = None

RAG_UNAVAILABLE_DETAIL = "RAG assistant is temporarily unavailable"


def _get_frontend_origins() -> List[str]:
    configured_origins = os.getenv("FRONTEND_ORIGINS", "")
    if configured_origins.strip():
        return [
            origin.strip().rstrip("/")
            for origin in configured_origins.split(",")
            if origin.strip()
        ]

    return [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]


def _build_and_initialize_agent(config: Config) -> RAGAgent:
    built_agent = RAGAgent(config)
    built_agent.initialize()
    return built_agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent, initialized, startup_error, runtime_config
    logger.info("🚀 RAG Agent API - Starting")

    runtime_config = Config(
        pdf_folder=os.getenv("PDF_FOLDER", "pdfs"),
        embedding_model=os.getenv("EMBEDDING_MODEL", "embed-english-v3.0"),
        embedding_provider=os.getenv("EMBEDDING_PROVIDER", "cohere"),  # "cohere", "openai", or "huggingface"
        llm_provider=os.getenv("LLM_PROVIDER", "groq"),
        ollama_model=os.getenv("OLLAMA_MODEL", "mistral"),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        groq_model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        max_tokens=int(os.getenv("MAX_TOKENS", "300")),
        temperature=float(os.getenv("TEMPERATURE", "0.3")),
        top_k_retrieval=int(os.getenv("TOP_K", "7")),
        port=int(os.getenv("PORT", "10000"))
    )
    app.state.config = runtime_config
    logger.info("✓ RAG config loaded")

    # Initialization is lightweight now (no PDF parsing / bulk embedding),
    # so build the agent synchronously during startup.
    try:
        agent = await asyncio.to_thread(_build_and_initialize_agent, runtime_config)
        initialized = True
        logger.info("✓ RAG agent ready (Supabase vector store)")
    except Exception as e:
        # Do not swallow failures: log the real error and report degraded health.
        startup_error = str(e)
        initialized = False
        agent = None
        logger.error(f"❌ RAG initialization failed: {e}", exc_info=True)

    yield
    logger.info("🛑 Shutting down")

app = FastAPI(title="Unified RAG Agent", version="1.0.0", lifespan=lifespan)

# CORS Middleware must be added first
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_frontend_origins(),
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
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
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
    rag_ready = bool(agent is not None and initialized)
    return {
        "status": "ok" if rag_ready else "degraded",
        "server_ready": True,
        "rag_ready": rag_ready,
        # Frontend compatibility: ragService.checkHealth() reads `ready`
        "ready": rag_ready,
        "vector_store": "supabase",
    }


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

        if not initialized or not agent:
            # Real initialization failure (bad config/keys) must surface as 503,
            # never as a fake "warming up" answer.
            logger.error(f"❌ /query rejected, agent not initialized: {startup_error}")
            raise HTTPException(status_code=503, detail=RAG_UNAVAILABLE_DETAIL)

        logger.info(f"🔍 Processing query: {request.query[:50]}...")
        try:
            result = await asyncio.to_thread(agent.query, request.query.strip())
        except Exception as query_error:
            logger.error(f"❌ Agent query failed: {query_error}", exc_info=True)
            raise HTTPException(status_code=503, detail=RAG_UNAVAILABLE_DETAIL)
        
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
            raise HTTPException(status_code=503, detail=RAG_UNAVAILABLE_DETAIL)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Query endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail=RAG_UNAVAILABLE_DETAIL)

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
    uvicorn.run(app, host="0.0.0.0", port=config.port, log_level="info", lifespan="on")

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
    parser.add_argument("--port", type=int, default=10000, help="API port (default: 10000)")
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
