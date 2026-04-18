"""Verdict classification from per-case results and fatal flags."""

from .schemas import CaseResult, Verdict


def classify(results: list[CaseResult], fatal: str | None) -> Verdict:
    if fatal == "SyntaxError":
        return "Syntax Error"
    if fatal == "TimeoutError":
        return "Time Limit Exceeded"
    if fatal == "MemoryError":
        return "Memory Limit Exceeded"
    if fatal is not None:
        return "Runtime Error"

    if not results:
        return "Runtime Error"

    error_types = {r.error for r in results if r.error}
    if any("MemoryError" in (r.error or "") for r in results):
        return "Memory Limit Exceeded"
    if error_types:
        return "Runtime Error"
    if all(r.passed for r in results):
        return "Accepted"
    return "Wrong Answer"
