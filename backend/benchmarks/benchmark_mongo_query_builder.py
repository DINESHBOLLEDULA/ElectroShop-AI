"""Measure pure Mongo query compilation; no database server is required."""

from __future__ import annotations

import time
import sys
from pathlib import Path

# Allow direct execution (`python benchmark_mongo_query_builder.py`) without
# requiring callers to manually configure PYTHONPATH.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from copilot.models.product_query import NumericRange, ProductQueryRequest, SafeRegex, SpecFilter
from copilot.service.mongo_query_builder import MongoQueryBuilder


def main(iterations: int = 10_000) -> None:
    request = ProductQueryRequest(
        categories=["phones"],
        brands=["Samsung", "OnePlus"],
        price=NumericRange(maximum=40_000),
        specs=[
            SpecFilter(field="display", regex=SafeRegex(value="AMOLED", mode="exact")),
            SpecFilter(field="storage", range=NumericRange(minimum=128)),
        ],
        include_total=True,
    )
    builder = MongoQueryBuilder()
    started = time.perf_counter()
    for _ in range(iterations):
        builder.build(request)
    elapsed_ms = (time.perf_counter() - started) * 1_000
    print(f"Compiled {iterations:,} query plans in {elapsed_ms:.2f} ms ({elapsed_ms / iterations:.4f} ms/plan)")


if __name__ == "__main__":
    main()
