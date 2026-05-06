import os
from pathlib import Path

CHROMA_PATH = os.getenv("CHROMA_PATH", str(Path(__file__).parent.parent.parent / "chroma_db"))
COLLECTION = "fraktl_corpus"

# Lazy-initialized singletons — avoids hitting ChromaDB/OpenAI at import time
vectorstore = None
retriever = None


def _init():
    """Initialize vectorstore and retriever on first use."""
    global vectorstore, retriever
    if vectorstore is not None:
        return

    from langchain_chroma import Chroma
    from langchain_openai import OpenAIEmbeddings
    from app.config import settings

    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=settings.openai_api_key,
    )

    vectorstore = Chroma(
        collection_name=COLLECTION,
        embedding_function=embeddings,
        persist_directory=CHROMA_PATH,
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})


def collection_has_data() -> bool:
    try:
        _init()
        return vectorstore._collection.count() > 0
    except Exception:
        return False


def get_context(species: str) -> str:
    try:
        _init()
        docs = retriever.invoke(species)
        return "\n\n".join(doc.page_content for doc in docs)
    except Exception:
        return ""
