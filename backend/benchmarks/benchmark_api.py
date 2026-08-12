"""Concurrent HTTP benchmark for every configured API endpoint."""
from __future__ import annotations
import argparse, asyncio, statistics, time
from urllib.request import Request, urlopen

async def one(url: str) -> float:
    started=time.perf_counter()
    await asyncio.to_thread(lambda: urlopen(Request(url), timeout=15).read())
    return (time.perf_counter()-started)*1000

async def main(base: str, paths: list[str], concurrency: int, rounds: int) -> None:
    for path in paths:
        samples=[]
        for _ in range(rounds):
            samples.extend(await asyncio.gather(*(one(base+path) for _ in range(concurrency))))
        samples.sort(); p95=samples[min(len(samples)-1, int(len(samples)*.95))]
        print(f"{path}: n={len(samples)} avg={statistics.mean(samples):.1f}ms p95={p95:.1f}ms max={max(samples):.1f}ms")

if __name__ == '__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--base', default='http://127.0.0.1:8000'); parser.add_argument('--concurrency',type=int,default=10); parser.add_argument('--rounds',type=int,default=10)
    args=parser.parse_args()
    asyncio.run(main(args.base, ['/', '/health', '/products', '/v2/ops/metrics'], args.concurrency, args.rounds))
