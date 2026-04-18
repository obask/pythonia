"""Request and response schemas for the /execute endpoint."""

from typing import Any, Literal

from pydantic import BaseModel, Field

Verdict = Literal[
    "Accepted",
    "Wrong Answer",
    "Runtime Error",
    "Time Limit Exceeded",
    "Memory Limit Exceeded",
    "Syntax Error",
]


class TestCase(BaseModel):
    input: list[Any]
    expected: Any
    visible: bool = True


class ExecuteRequest(BaseModel):
    code: str
    function_name: str
    tests: list[TestCase]
    timeout_ms: int = Field(default=2000, ge=100, le=10000)
    memory_mb: int = Field(default=128, ge=16, le=512)


class CaseResult(BaseModel):
    passed: bool
    input: list[Any]
    expected: Any
    actual: Any = None
    visible: bool
    error: str | None = None


class ExecuteResponse(BaseModel):
    verdict: Verdict
    results: list[CaseResult]
    runtime_ms: int
