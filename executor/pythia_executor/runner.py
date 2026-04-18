"""Runs user code in a subprocess and parses the harness output."""

from __future__ import annotations

import ast
import json
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from .schemas import CaseResult, ExecuteRequest, ExecuteResponse
from .verdicts import classify


def execute(req: ExecuteRequest) -> ExecuteResponse:
    try:
        ast.parse(req.code)
    except SyntaxError:
        return ExecuteResponse(verdict="Syntax Error", results=[], runtime_ms=0)

    payload = {
        "code": req.code,
        "function_name": req.function_name,
        "tests": [t.model_dump() for t in req.tests],
        "timeout_ms": req.timeout_ms,
        "memory_mb": req.memory_mb,
    }
    wall_timeout_s = req.timeout_ms / 1000 + 1.0
    harness_path = Path(__file__).with_name("harness.py")

    start = time.monotonic()
    try:
        proc = subprocess.run(
            [sys.executable, "-I", str(harness_path)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=wall_timeout_s,
            check=False,
        )
    except subprocess.TimeoutExpired:
        runtime_ms = int((time.monotonic() - start) * 1000)
        return ExecuteResponse(
            verdict="Time Limit Exceeded",
            results=[],
            runtime_ms=runtime_ms,
        )

    runtime_ms = int((time.monotonic() - start) * 1000)

    if proc.returncode < 0:
        killed_by = signal.Signals(-proc.returncode)
        if killed_by in {signal.SIGXCPU, signal.SIGALRM}:
            return ExecuteResponse(
                verdict="Time Limit Exceeded",
                results=[],
                runtime_ms=runtime_ms,
            )
        if killed_by in {signal.SIGKILL, signal.SIGSEGV, signal.SIGBUS}:
            return ExecuteResponse(
                verdict="Memory Limit Exceeded",
                results=[],
                runtime_ms=runtime_ms,
            )
        return ExecuteResponse(
            verdict="Runtime Error",
            results=[],
            runtime_ms=runtime_ms,
        )

    if not proc.stdout.strip():
        return ExecuteResponse(
            verdict="Runtime Error",
            results=[],
            runtime_ms=runtime_ms,
        )

    try:
        envelope: dict[str, Any] = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return ExecuteResponse(
            verdict="Runtime Error",
            results=[],
            runtime_ms=runtime_ms,
        )

    fatal = envelope.get("fatal")
    raw_results = envelope.get("results", [])
    results = [CaseResult(**r) for r in raw_results]
    verdict = classify(results, fatal)
    return ExecuteResponse(verdict=verdict, results=results, runtime_ms=runtime_ms)
