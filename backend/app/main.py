from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routers import history

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Fraktl API", lifespan=lifespan)
app.include_router(history.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
