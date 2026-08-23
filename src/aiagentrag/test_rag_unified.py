#!/usr/bin/env python3
"""Focused tests for the Supabase-backed production RAG.

All external services (Supabase RPC, Cohere, Groq) are mocked.
Run: python -m unittest src.aiagentrag.test_rag_unified -v
"""

import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

import rag_unified
from rag_unified import Config, RAGAgent, VectorStore

DUMMY_ENV = {
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_SECRET_KEY": "dummy-service-key",
    "COHERE_API_KEY": "dummy-cohere-key",
    "GROQ_API_KEY": "dummy-groq-key",
    # Hermetic defaults: a developer machine may have EMBEDDING_PROVIDER=huggingface
    # exported via .env, which would drag in heavy local models.
    "EMBEDDING_MODEL": "embed-english-v3.0",
    "EMBEDDING_PROVIDER": "cohere",
    "LLM_PROVIDER": "groq",
}


def make_config() -> Config:
    return Config(
        pdf_folder=str(Path(__file__).parent / "pdfs"),
        embedding_model="embed-english-v3.0",
        embedding_provider="cohere",
        llm_provider="groq",
    )


class EnvMixin:
    """Force deterministic dummy credentials for every test."""

    def setUp(self):
        self._env_backup = {k: os.environ.get(k) for k in DUMMY_ENV}
        os.environ.update(DUMMY_ENV)

    def tearDown(self):
        for k, v in self._env_backup.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


class FakeSupabaseClient(MagicMock):
    def build(self, rows, error=None):
        rpc_mock = MagicMock()
        if error is not None:
            rpc_mock.execute.side_effect = error
        else:
            rpc_mock.execute.return_value = SimpleNamespace(data=rows)
        self.rpc.return_value = rpc_mock
        return self


class TestVectorStore(EnvMixin, unittest.TestCase):

    def _store(self, rows=None, error=None):
        with patch("supabase.create_client", return_value=FakeSupabaseClient().build(rows, error)):
            return VectorStore()

    def test_missing_env_fails_fast(self):
        del os.environ["SUPABASE_URL"]
        del os.environ["SUPABASE_SECRET_KEY"]
        with self.assertRaises(ValueError) as ctx:
            VectorStore()
        self.assertIn("SUPABASE_URL", str(ctx.exception))

    def test_search_calls_match_documents_rpc_and_normalizes_rows(self):
        rows = [
            {
                "id": 1,
                "content": "Autism is a developmental condition.",
                "metadata": {"source": "autism_guide.pdf", "chunk_id": 3},
                "similarity": 0.91,
            }
        ]
        store = self._store(rows)
        query_vec = np.zeros(1024)

        results = store.search(query_vec, top_k=7)

        store.client.rpc.assert_called_once_with(
            "match_documents",
            {"query_embedding": query_vec.tolist(), "match_count": 7},
        )
        self.assertEqual(len(results), 1)
        entry = results[0]
        self.assertEqual(entry["content"], "Autism is a developmental condition.")
        self.assertEqual(entry["source"], "autism_guide.pdf")
        self.assertEqual(entry["chunk_id"], 3)
        self.assertEqual(entry["similarity"], 0.91)

    def test_search_accepts_plain_list_embedding(self):
        store = self._store([])
        results = store.search([0.0] * 1024, top_k=5)
        self.assertEqual(results, [])
        _, kwargs_payload = store.client.rpc.call_args[0][0], store.client.rpc.call_args[0][1]
        self.assertEqual(kwargs_payload["match_count"], 5)
        self.assertEqual(len(kwargs_payload["query_embedding"]), 1024)

    def test_search_wrong_dimension_raises_clear_error(self):
        store = self._store([])
        with self.assertRaises(ValueError) as ctx:
            store.search([0.0] * 384, top_k=5)
        self.assertIn("vector(1024)", str(ctx.exception))

    def test_search_rpc_failure_is_observable(self):
        store = self._store(error=RuntimeError("connection refused"))
        with self.assertRaises(RuntimeError) as ctx:
            store.search([0.0] * 1024, top_k=5)
        self.assertIn("Vector retrieval from Supabase failed", str(ctx.exception))

    def test_search_none_data_returns_empty(self):
        store = self._store(None)
        self.assertEqual(store.search([0.0] * 1024, top_k=7), [])


class TestRAGAgent(EnvMixin, unittest.TestCase):

    def _agent(self):
        with patch("supabase.create_client", return_value=FakeSupabaseClient().build([])):
            return RAGAgent(make_config())

    def test_initialization_is_lightweight(self):
        agent = self._agent()

        # Any PDF loading / bulk embedding attempt must fail the test loudly
        agent.pdf_processor.load_all = MagicMock(
            side_effect=AssertionError("PDF ingestion ran during startup!")
        )
        agent.chunker.chunk = MagicMock(
            side_effect=AssertionError("Chunking ran during startup!")
        )
        agent.embeddings.embed_many = MagicMock(
            side_effect=AssertionError("Bulk document embedding ran during startup!")
        )

        started = __import__("time").perf_counter_ns()
        agent.initialize()
        elapsed_s = (__import__("time").perf_counter_ns() - started) / 1e9

        self.assertTrue(agent.initialized)
        self.assertLess(elapsed_s, 5.0, "initialize() must be fast/deterministic")
        agent.pdf_processor.load_all.assert_not_called()
        agent.embeddings.embed_many.assert_not_called()

    def test_greeting_skips_retrieval_entirely(self):
        agent = self._agent()

        def forbidden(*args, **kwargs):
            raise AssertionError("Supabase retrieval must not run for greetings")

        agent.vector_store.search = forbidden
        result = agent.query("hello")

        self.assertEqual(result["query_type"], "greeting")
        self.assertEqual(result["sources"], [])
        self.assertIn("assist", result["answer"].lower())

    def test_full_rag_pipeline_for_real_question(self):
        agent = self._agent()

        agent.embeddings.embed_one = MagicMock(return_value=np.full(1024, 0.1))
        agent.vector_store.search = MagicMock(return_value=[
            {"content": "Autism spectrum disorder affects communication.", "source": "autism.pdf", "similarity": 0.9},
            {"content": "Early intervention helps.", "source": "autism.pdf", "similarity": 0.8},
        ])
        agent.llm.generate = MagicMock(return_value="Autism affects communication skills.")

        result = agent.query("What is autism?")

        # Cohere query embedding used exactly once
        agent.embeddings.embed_one.assert_called_once_with("What is autism?")
        # Supabase RPC receives the query vector and TOP_K
        agent.vector_store.search.assert_called_once()
        args, kwargs = agent.vector_store.search.call_args
        np.testing.assert_array_equal(np.asarray(args[0]), np.full(1024, 0.1))
        self.assertEqual(args[1], agent.config.top_k_retrieval)
        # Retrieved chunks are passed to the existing generation layer
        agent.llm.generate.assert_called_once()
        passed_query, passed_context = agent.llm.generate.call_args[0]
        self.assertEqual(passed_query, "What is autism?")
        self.assertIn("[Source: autism.pdf]", passed_context)
        self.assertIn("Autism spectrum disorder affects communication.", passed_context)

        self.assertEqual(result["answer"], "Autism affects communication skills.")
        self.assertEqual(result["query_type"], "search")
        self.assertEqual(len(result["sources"]), 2)

    def test_dyslexia_question_uses_same_rag_path(self):
        agent = self._agent()

        agent.embeddings.embed_one = MagicMock(return_value=np.zeros(1024))
        agent.vector_store.search = MagicMock(return_value=[
            {"content": "Dyslexia affects reading fluency.", "source": "dyslexia.pdf"},
        ])
        agent.llm.generate = MagicMock(return_value="Dyslexia impacts reading.")

        result = agent.query("What is dyslexia?")

        agent.embeddings.embed_one.assert_called_once_with("What is dyslexia?")
        agent.vector_store.search.assert_called_once()
        self.assertEqual(result["query_type"], "search")
        self.assertEqual(result["answer"], "Dyslexia impacts reading.")

    def test_zero_retrieval_answers_gracefully_without_llm(self):
        agent = self._agent()

        agent.embeddings.embed_one = MagicMock(return_value=np.zeros(1024))
        agent.vector_store.search = MagicMock(return_value=[])
        agent.llm.generate = MagicMock()

        result = agent.query("What is quantum chromodynamics?")

        agent.llm.generate.assert_not_called()
        self.assertEqual(result["query_type"], "no_results")
        self.assertIn("don't have information", result["answer"])

    def test_cohere_failure_propagates_not_swallowed(self):
        agent = self._agent()
        agent.embeddings.embed_one = MagicMock(side_effect=RuntimeError("cohere down"))

        with self.assertRaises(RuntimeError):
            agent.query("What is autism?")


QUERY_ROWS = [
    {
        "content": "Autism is a developmental condition.",
        "metadata": {"source": "autism.pdf"},
        "similarity": 0.9,
    }
]


class TestAPIEndpoints(EnvMixin, unittest.TestCase):

    def _client(self, startup_fails: bool = False):
        from fastapi.testclient import TestClient

        if startup_fails:
            failing = MagicMock(side_effect=RuntimeError("bad credentials"))
            patcher = patch.object(rag_unified, "_build_and_initialize_agent", failing)
        else:
            fake_agent = MagicMock(spec=RAGAgent)
            fake_agent.query.return_value = {
                "query": "What is autism?",
                "answer": "Grounded answer.",
                "sources": [{"source": "autism.pdf", "content": "Autism is ..."}],
                "processing_time_ms": 12.0,
                "query_type": "search",
                "from_cache": False,
            }
            patcher = patch.object(
                rag_unified, "_build_and_initialize_agent", MagicMock(return_value=fake_agent)
            )

        patcher.start()
        self.addCleanup(patcher.stop)

        client = TestClient(rag_unified.app)
        client.__enter__()
        self.addCleanup(client.__exit__, None, None, None)
        return client

    def test_health_reports_ready_after_startup(self):
        client = self._client()
        resp = client.get("/health")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "ok")
        self.assertTrue(body["server_ready"])
        self.assertTrue(body["rag_ready"])
        self.assertTrue(body["ready"])  # frontend contract
        self.assertEqual(body["vector_store"], "supabase")

    def test_health_reports_degraded_when_startup_failed(self):
        client = self._client(startup_fails=True)
        resp = client.get("/health")
        body = resp.json()
        self.assertEqual(body["status"], "degraded")
        self.assertFalse(body["rag_ready"])
        self.assertFalse(body["ready"])

    def test_query_greeting_fast_path(self):
        client = self._client()
        resp = client.post("/query", json={"query": "hello"})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["query_type"], "greeting")

    def test_query_routes_real_question_through_agent(self):
        client = self._client()
        resp = client.post("/query", json={"query": "What is autism?"})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["query_type"], "search")
        self.assertEqual(len(body["sources"]), 1)
        self.assertEqual(body["sources"][0]["source"], "autism.pdf")

    def test_query_returns_503_when_agent_failed_to_initialize(self):
        client = self._client(startup_fails=True)
        resp = client.post("/query", json={"query": "What is autism?"})
        self.assertEqual(resp.status_code, 503)
        self.assertNotIn("still loading", resp.json()["detail"].lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)
