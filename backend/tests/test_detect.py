import pytest
from io import BytesIO
from app.services.detector import is_valid_tree_frame

def test_bright_frame_with_edges_is_valid(bright_frame_bytes):
    valid, hint = is_valid_tree_frame(bright_frame_bytes)
    assert valid is True

def test_dark_frame_is_invalid(dark_frame_bytes):
    valid, hint = is_valid_tree_frame(dark_frame_bytes)
    assert valid is False
    assert "luz" in hint.lower()

def test_invalid_bytes_returns_false():
    valid, hint = is_valid_tree_frame(b"not-an-image")
    assert valid is False
