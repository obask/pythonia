"""Subprocess harness that executes user code against test cases.

Reads a JSON payload from stdin:
    {"code": str, "function_name": str, "tests": [...], "memory_mb": int}

Writes a JSON envelope to stdout:
    {"results": [{"passed", "input", "expected", "actual", "visible",
                  "error", "error_type"}, ...]}

Never calls the user's function in the parent interpreter. Resource limits
are applied via setrlimit in this process before the code runs.
"""

from __future__ import annotations

import json
import math
import resource
import sys
import traceback
from typing import Any


def _apply_limits(memory_mb: int, timeout_ms: int) -> None:
    mem_bytes = memory_mb * 1024 * 1024
    cpu_seconds = max(1, math.ceil(timeout_ms / 1000))
    try:
        resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
    except (ValueError, OSError):
        pass
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
    except (ValueError, OSError):
        pass
    try:
        resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
    except (ValueError, OSError):
        pass


def _run_case(fn: Any, args: list[Any], expected: Any, visible: bool) -> dict[str, Any]:
    try:
        actual = fn(*args)
    except MemoryError:
        return {
            "passed": False,
            "input": args,
            "expected": expected,
            "actual": None,
            "visible": visible,
            "error": traceback.format_exc().strip(),
            "error_type": "MemoryError",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "passed": False,
            "input": args,
            "expected": expected,
            "actual": None,
            "visible": visible,
            "error": traceback.format_exc().strip(),
            "error_type": type(exc).__name__,
        }
    return {
        "passed": actual == expected,
        "input": args,
        "expected": expected,
        "actual": actual,
        "visible": visible,
        "error": None,
        "error_type": None,
    }


def main() -> None:
    payload = json.loads(sys.stdin.read())
    _apply_limits(
        int(payload.get("memory_mb", 128)),
        int(payload.get("timeout_ms", 2000)),
    )

    namespace: dict[str, Any] = {}
    try:
        compiled = compile(payload["code"], "<user>", "exec")
        exec(compiled, namespace)  # noqa: S102
    except MemoryError:
        sys.stdout.write(
            json.dumps(
                {
                    "results": [],
                    "fatal": "MemoryError",
                    "message": traceback.format_exc().strip(),
                }
            )
        )
        return
    except Exception as exc:  # noqa: BLE001
        sys.stdout.write(
            json.dumps(
                {
                    "results": [],
                    "fatal": type(exc).__name__,
                    "message": traceback.format_exc().strip(),
                }
            )
        )
        return

    fn = namespace.get(payload["function_name"])
    if not callable(fn):
        sys.stdout.write(
            json.dumps(
                {
                    "results": [],
                    "fatal": "NameError",
                    "message": f"Function '{payload['function_name']}' is not defined",
                }
            )
        )
        return

    results = [
        _run_case(fn, t["input"], t["expected"], t.get("visible", True))
        for t in payload["tests"]
    ]
    sys.stdout.write(json.dumps({"results": results}))


if __name__ == "__main__":
    main()
