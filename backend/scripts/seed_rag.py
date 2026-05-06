"""
Indexes botanical corpus into ChromaDB.
Runs automatically on backend startup if collection is empty.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from langchain_community.document_loaders import WikipediaLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

SPECIES_LIST = [
    "Quercus robur",
    "Pinus sylvestris",
    "Fagus sylvatica",
    "Betula pendula",
    "Acer platanoides",
    "Fraxinus excelsior",
    "Tilia cordata",
    "Castanea sativa",
    "Populus tremula",
]

CORPUS_PATH = Path(__file__).parent.parent / "app/rag/corpus/fraktl_base.json"


def seed():
    # Import here to allow lazy init in retriever
    from app.rag.retriever import vectorstore

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    docs_to_add = []

    # Wikipedia articles
    for species in SPECIES_LIST:
        print(f"Loading Wikipedia: {species}")
        try:
            raw = WikipediaLoader(query=species, load_max_docs=1).load()
            chunks = splitter.split_documents(raw)
            docs_to_add.extend(chunks)
        except Exception as e:
            print(f"  Warning: {e}")

    # Fraktl proprietary corpus
    fraktl_data = json.loads(CORPUS_PATH.read_text())
    for entry in fraktl_data:
        content = (
            f"Especie: {entry['species']}\n"
            f"Firma Fraktl: {entry['signature']}\n"
            f"Fibonacci: {entry['fibonacci_note']}"
        )
        docs_to_add.append(Document(
            page_content=content,
            metadata={"species": entry["species"], "source": "fraktl_base"},
        ))

    if docs_to_add:
        vectorstore.add_documents(docs_to_add)
        print(f"Seed complete: {len(docs_to_add)} chunks indexed.")
    else:
        print("Seed: no documents to add.")


if __name__ == "__main__":
    seed()
