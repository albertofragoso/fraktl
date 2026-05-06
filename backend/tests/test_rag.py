import pytest
from unittest.mock import patch, MagicMock
import app.rag.retriever  # ensure module is imported before patching


def test_get_context_returns_string():
    mock_docs = [
        MagicMock(page_content="El roble sigue el ángulo áureo de 137.5°"),
        MagicMock(page_content="Exponente de Hausdorff ~1.7"),
    ]
    mock_retriever = MagicMock()
    mock_retriever.invoke.return_value = mock_docs

    with patch("app.rag.retriever._init"), \
         patch("app.rag.retriever.retriever", mock_retriever):
        from app.rag.retriever import get_context
        result = get_context("Quercus robur")

    assert isinstance(result, str)
    assert len(result) > 0


def test_collection_has_data_returns_bool():
    mock_vs = MagicMock()

    mock_vs._collection.count.return_value = 5
    with patch("app.rag.retriever._init"), \
         patch("app.rag.retriever.vectorstore", mock_vs):
        from app.rag.retriever import collection_has_data
        assert collection_has_data() is True

    mock_vs._collection.count.return_value = 0
    with patch("app.rag.retriever._init"), \
         patch("app.rag.retriever.vectorstore", mock_vs):
        assert collection_has_data() is False
