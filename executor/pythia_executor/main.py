"""FastAPI app — single POST /execute endpoint."""

from __future__ import annotations

import os

import uvicorn
from fastapi import FastAPI

from .runner import execute
from .schemas import ExecuteRequest, ExecuteResponse

app = FastAPI(
    title="Pythia Executor",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.post("/execute", response_model=ExecuteResponse)
def execute_endpoint(req: ExecuteRequest) -> ExecuteResponse:
    return execute(req)


def run() -> None:
    port = int(os.environ.get("PYTHIA_EXECUTOR_PORT", "8765"))
    host = os.environ.get("PYTHIA_EXECUTOR_HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port, log_level="warning")


if __name__ == "__main__":
    run()
