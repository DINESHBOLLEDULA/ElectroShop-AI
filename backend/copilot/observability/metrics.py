"""In-process API metrics, exportable to Prometheus/OpenTelemetry later."""
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass


@dataclass
class RouteMetric:
    count: int = 0
    errors: int = 0
    total_ms: float = 0
    max_ms: float = 0

    def as_dict(self) -> dict[str, float | int]:
        return {"requests": self.count, "errors": self.errors, "avg_ms": round(self.total_ms / self.count, 2) if self.count else 0, "max_ms": round(self.max_ms, 2)}


class MetricsRegistry:
    def __init__(self) -> None:
        self._routes: dict[str, RouteMetric] = defaultdict(RouteMetric)

    def record(self, route: str, status_code: int, started: float) -> None:
        elapsed = (time.perf_counter() - started) * 1_000
        metric = self._routes[route]
        metric.count += 1
        metric.errors += int(status_code >= 500)
        metric.total_ms += elapsed
        metric.max_ms = max(metric.max_ms, elapsed)

    def snapshot(self) -> dict[str, dict[str, float | int]]:
        return {route: metric.as_dict() for route, metric in self._routes.items()}


metrics = MetricsRegistry()
