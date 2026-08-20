from dotenv import load_dotenv
from pathlib import Path

from rag_unified import (
    Config,
    PDFProcessor,
    DocumentChunker,
    EmbeddingEngine,
    VectorStore,
)

load_dotenv()

def main():
    config = Config(
        pdf_folder="pdfs",
        embedding_model="embed-english-v3.0",
        embedding_provider="cohere",
    )

    print("📚 Loading PDFs...")

    pdf_processor = PDFProcessor(config.pdf_folder)
    documents = pdf_processor.load_all()

    if not documents:
        print("❌ No PDFs found in the pdfs folder.")
        return

    print(f"✅ Loaded {len(documents)} PDF files")

    print("✂️ Chunking documents...")

    chunker = DocumentChunker(
        config.chunk_size,
        config.chunk_overlap
    )

    chunks = chunker.chunk(documents)

    print(f"✅ Created {len(chunks)} chunks")

    print("🧠 Generating Cohere embeddings...")

    embedding_engine = EmbeddingEngine(
        config.embedding_model,
        config.embedding_provider
    )

    texts = [chunk["content"] for chunk in chunks]

    embeddings = embedding_engine.embed_many(texts)

    print(f"✅ Generated {len(embeddings)} embeddings")
    print(f"📐 Embedding dimension: {len(embeddings[0])}")

    print("☁️ Uploading to Supabase...")

    vector_store = VectorStore()
    vector_store.initialize(chunks, embeddings)

    print("🎉 Ingestion completed successfully!")


if __name__ == "__main__":
    main()