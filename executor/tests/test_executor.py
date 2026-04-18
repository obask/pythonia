"""End-to-end tests that exercise the real subprocess harness."""

from __future__ import annotations

from fastapi.testclient import TestClient

from pythia_executor.main import app
from pythia_executor.runner import execute
from pythia_executor.schemas import ExecuteRequest, TestCase


def _req(code: str, tests: list[TestCase], **kw) -> ExecuteRequest:
    return ExecuteRequest(
        code=code, function_name="f", tests=tests, **kw
    )


def test_accepted():
    code = "def f(x):\n    return x * x\n"
    tests = [TestCase(input=[2], expected=4), TestCase(input=[-3], expected=9)]
    res = execute(_req(code, tests))
    assert res.verdict == "Accepted"
    assert all(r.passed for r in res.results)


def test_wrong_answer():
    code = "def f(x):\n    return x + 1\n"
    tests = [TestCase(input=[2], expected=4)]
    res = execute(_req(code, tests))
    assert res.verdict == "Wrong Answer"
    assert res.results[0].actual == 3


def test_syntax_error():
    code = "def f(x):\n    return x *\n"
    tests = [TestCase(input=[2], expected=4)]
    res = execute(_req(code, tests))
    assert res.verdict == "Syntax Error"
    assert res.results == []


def test_runtime_error():
    code = "def f(x):\n    return x / 0\n"
    tests = [TestCase(input=[2], expected=0)]
    res = execute(_req(code, tests))
    assert res.verdict == "Runtime Error"
    assert "ZeroDivisionError" in (res.results[0].error or "")


def test_missing_function():
    code = "def g(x):\n    return x\n"
    tests = [TestCase(input=[1], expected=1)]
    res = execute(_req(code, tests))
    assert res.verdict == "Runtime Error"


def test_timeout():
    code = "def f(x):\n    while True: pass\n"
    tests = [TestCase(input=[1], expected=1)]
    res = execute(_req(code, tests, timeout_ms=500))
    assert res.verdict == "Time Limit Exceeded"


def test_accepted_with_list_return():
    code = "def f(n):\n    return [i*i for i in range(n)]\n"
    tests = [TestCase(input=[3], expected=[0, 1, 4])]
    res = execute(_req(code, tests))
    assert res.verdict == "Accepted"


def test_executor_exposes_only_execute_endpoint():
    client = TestClient(app)
    assert client.get("/openapi.json").status_code == 404
    user_routes = {
        (method, route.path)
        for route in app.routes
        for method in getattr(route, "methods", set())
        if method not in {"HEAD", "OPTIONS"}
    }
    assert user_routes == {("POST", "/execute")}
