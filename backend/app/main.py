from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routers import history, scan

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.rag.retriever import collection_has_data
    if not collection_has_data():
        print("ChromaDB empty — running seed script...")
        try:
            from scripts.seed_rag import seed
            seed()
        except Exception as e:
            print(f"Seed warning: {e}")
    yield

app = FastAPI(title="Fraktl API", lifespan=lifespan)
app.include_router(history.router)
app.include_router(scan.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
