from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass
class StepResult(Generic[T]):
    value: T | None
    error: str | None

    @property
    def ok(self) -> bool:
        return self.error is None
