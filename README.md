# flare-bench

How much overhead a web framework adds over bare `node:http` on the simplest request. It runs
the [fastify/benchmarks](https://github.com/fastify/benchmarks) tool unmodified, trimmed to a
small field with Flare added.

| Framework | Role |
| :-- | :-- |
| node-http | Raw `node:http`, the overhead floor |
| fastify | The reference |
| flare | The subject |
| hono | Comparison |
| express | Comparison |

Each serves one route, `GET /` returning `{"hello":"world"}`. Only the gap between them means
anything; the absolute number depends on the machine.

## Results

From GitHub's `ubuntu-latest` runner (4 vCPU on public repos, matching fastify's own setup).

**Median of five runs** (`CV%` is the run-to-run spread):

<!-- results:5x:start -->

_2026-07-07 - Node v24.18.0 - GitHub Actions 1000000130 (4 vCPU, 15.6GB) - median of 5 sweeps_

| Framework | Version | Requests/s | Latency (ms) | Throughput (Mb/s) | CV% |
| :-- | --: | --: | --: | --: | --: |
| node-http | v24.18.0 | 48038.4 | 20.3 | 8.57 | 1.07% |
| fastify | 5.10.0 | 47043.2 | 20.74 | 8.43 | 0.79% |
| flare | 0.3.0-next.7 | 46886.4 | 20.81 | 7.74 | 0.9% |
| hono | 4.12.28 | 39963.2 | 24.52 | 6.55 | 1.22% |
| express | 5.2.1 | 27688.8 | 35.62 | 4.94 | 1.45% |

<!-- results:5x:end -->

**Single run**, in fastify's table format:

<!-- results:single:start -->

_2026-07-07 - Node v24.18.0 - 4 vCPU, 15.6GB - single run_

| Framework | Version | Requests/s | Latency (ms) | Throughput (Mb/s) |
| :-- | --: | --: | --: | --: |
| node-http | v24.18.0 | 47304.8 | 20.64 | 8.44 |
| fastify | 5.10.0 | 46394.4 | 21.04 | 8.32 |
| flare | 0.3.0-next.7 | 45796.0 | 21.32 | 7.56 |
| hono | 4.12.28 | 38618.4 | 25.40 | 6.33 |
| express | 5.2.1 | 27132.0 | 36.35 | 4.84 |

<!-- results:single:end -->

Shared runners are noisy, so compare gaps within one run, not absolutes across runs or against
fastify's published table (different machine, different day).

## Methodology

fastify/benchmarks' tool, used as-is: fork each framework's server, fire one discarded warm-up
round, then one measured round with autocannon (`-c 100 -p 10 -d 40`). The tool files
(`benchmark*.js`, `lib/bench.js`, `lib/autocannon.js`) are byte-for-byte fastify's; the only
edit is trimming the framework list in `lib/packages.js`. Reporting the five-run median
(`aggregate.mjs`) is the sole addition.

## The Flare handler

[`benchmarks/flare.mjs`](benchmarks/flare.mjs) imports `@flare-ts/core` and `@flare-ts/lib`
from npm and serves the route through a response schema, loading its framework exactly as the
other handlers do. [`flare.json`](flare.json) matches fastify's minimal handler: logger off
(`log.level: fatal`) and no `x-request-id` header (`host.requestIdHeader: false`), so the
benchmark measures dispatch overhead, not optional features.

## Running locally

```
npm install
npm start y 100 10 40         # one pass -> results/<framework>.json
node ./benchmark compare -t   # fastify's table + benchmark-results.json
```

For the median, run the pass five times into `runs/run-N/`, then `node aggregate.mjs runs history`.

## In CI

Two manually-triggered workflows on `ubuntu-latest`:

- [`bench (5x median)`](.github/workflows/bench.yml): five runs, updates the median table above,
  and commits a full per-run record to `history/`.
- [`bench (fastify, single run)`](.github/workflows/bench-fastify.yml): one run, updates the
  single-run table above, and commits `benchmark-results.json`.

## Credit

Tool and handlers from [fastify/benchmarks](https://github.com/fastify/benchmarks) (MIT); see
[LICENSE](LICENSE).
