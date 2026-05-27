from app.types import StepResult


def test_ok_result_has_ok_true():
    result: StepResult[str] = StepResult(value="hello", error=None)
    assert result.ok is True
    assert result.value == "hello"


def test_failed_result_has_ok_false():
    result: StepResult[str] = StepResult(value=None, error="timeout")
    assert result.ok is False
    assert result.error == "timeout"


def test_generic_works_with_bytes():
    result: StepResult[bytes] = StepResult(value=b"audio-data", error=None)
    assert result.ok is True
    assert result.value == b"audio-data"


def test_generic_works_with_dict():
    result: StepResult[dict] = StepResult(value={"species": "Quercus robur"}, error=None)
    assert result.ok is True
    assert result.value["species"] == "Quercus robur"


def test_ok_is_determined_by_error_not_value():
    # ok is True when error is None, regardless of value
    result: StepResult[str] = StepResult(value=None, error=None)
    assert result.ok is True

    # ok is False when error is set, regardless of value
    result2: StepResult[str] = StepResult(value="present", error="also-present")
    assert result2.ok is False
