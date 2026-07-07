# flare-bench

HTTP framework overhead benchmark. It measures how much a framework adds over a bare
`node:http` server on the simplest possible request, using the
[fastify/benchmarks](https://github.com/fastify/benchmarks) methodology unchanged.

The field is deliberately small: Flare against the frameworks it is most often compared to,
plus raw `node:http` as the floor.

| Framework | Role |
| :-- | :-- |
| node-http | Raw `node:http`, the overhead floor |
| fastify | The reference to beat |
| flare | The subject |
| hono | Comparison |
| express | Comparison |

Every framework serves one route, `GET /`, returning `{"hello":"world"}` with a JSON
content type. The number that matters is the gap between them, not the absolute figure.

## Methodology

The measurement is fastify/benchmarks' own tool, used unmodified. For each framework the runner
forks its server, fires one warm-up round that is discarded, then fires one measured round with
[autocannon](https://github.com/mcollina/autocannon):

```
autocannon -c 100 -p 10 -d 40   # 100 connections, pipelining 10, 40 seconds
```

The tool files (`benchmark.js`, `benchmark-bench.js`, `benchmark-compare.js`, `lib/bench.js`,
`lib/autocannon.js`) are byte-for-byte copies of fastify/benchmarks. The only edited file is
`lib/packages.js`, whose framework list is trimmed to the five above with Flare added; its
resolution logic is untouched. The handlers in `benchmarks/` are fastify's, plus `flare.mjs`.

There are two ways to run it (see [Continuous runs](#continuous-runs)):

- **Single run**, exactly as fastify does it: one pass, then fastify's compare tool writes
  `benchmark-results.json` and the README table.
- **Five sweeps**, the only methodological addition: run the single pass five times and report
  the **median** of each metric (`aggregate.mjs`), so one noisy sweep cannot move the result.

## The Flare handler

Every handler in `benchmarks/` loads its framework from `node_modules` and serves the one
route; Flare is no different. [`benchmarks/flare.mjs`](benchmarks/flare.mjs) imports
`@flare-ts/core` and `@flare-ts/lib` (runtime dependencies) and returns `{"hello":"world"}`
through a response schema. Nothing is bundled or pre-built, so Flare runs exactly like the
others. The benchmarked version is whatever `@flare-ts/core` resolves to in `package.json`,
reported as Flare's version in the results.

[`flare.json`](flare.json) holds Flare at the same minimal-overhead baseline as the other
handlers. fastify's handler runs with no logger and emits no request-id header; Flare defaults
to both, so the config silences the logger (`log.level: fatal`) and drops the `x-request-id`
response header (`host.requestIdHeader: false`). What is left is dispatch overhead, not
optional features. Flare reads the file from the working directory at startup.

## Running it

```
npm install
npm start y 100 10 40         # one pass; writes results/<framework>.json
node ./benchmark compare -t   # fastify's table + benchmark-results.json
```

`npm start` runs `node benchmark.js`; the leading `y` is fastify's "run all" flag, and because
only five frameworks are registered, "all" is those five. The three numbers are connections,
pipelining, and duration.

For the five-sweep median locally, run the pass five times, collect each into `runs/run-N/`,
then aggregate:

```
node aggregate.mjs runs history
```

## Continuous runs

Laptop numbers drift with thermal state and background load. Both workflows remove that by
running on a fresh GitHub-hosted `ubuntu-latest` runner, triggered manually from the Actions
tab. Runner size depends on repository visibility: public repos get fastify's 4-vCPU / 16GB
runner, private repos a 2-vCPU / 7GB one, which roughly halves throughput. Each record carries
its `cpus` and `memGB` so the machine is verifiable.

- [`bench (5x median)`](.github/workflows/bench.yml) runs five sweeps, prints the ranked table
  to the run summary, and commits the aggregated record to `history/`. This is the stable feed
  for downstream consumers.
- [`bench (fastify, single run)`](.github/workflows/bench-fastify.yml) mirrors
  fastify/benchmarks' own workflow step for step: one run, then `compare` writes
  `benchmark-results.json` and refreshes the `# Benchmarks` table at the bottom of this README.

## Results history

Each run writes one file, `history/<date>-<runId>.json`, holding the environment, the method,
and per-framework statistics:

```json
{
  "date": "2026-07-06T00:00:00.000Z",
  "runId": "123456789",
  "commit": "…",
  "runner": "GitHub Actions 3",
  "cpus": 4,
  "cpuModel": "…",
  "memGB": 15.6,
  "node": "v24.x",
  "sweeps": 5,
  "method": "autocannon -c 100 -p 10 -d 40, one warm-up round and one measured round per framework",
  "results": [
    {
      "name": "flare",
      "version": "0.3.0-next.7",
      "requests": { "median": 0, "mean": 0, "min": 0, "max": 0, "stddev": 0, "cvPct": 0 },
      "latencyMs": { "median": 0, "mean": 0, "min": 0, "max": 0, "stddev": 0, "cvPct": 0 },
      "throughputMb": { "median": 0, "mean": 0, "min": 0, "max": 0, "stddev": 0, "cvPct": 0 }
    }
  ]
}
```

`results` is sorted fastest first by median requests/s. `cvPct` is the coefficient of
variation across sweeps: a low value means the run was stable and the median is trustworthy.

## Caveats

- GitHub-hosted runners are shared. They remove thermal throttling and background-app noise,
  but a busy neighbour still adds variance; the five-sweep median and the reported `cvPct`
  exist to expose it. Compare gaps between frameworks in the same run, not absolute figures
  across runs.
- These are not fastify's official numbers. Same methodology, different field and machine.

## Credit and license

The benchmark tool and handlers are derived from
[fastify/benchmarks](https://github.com/fastify/benchmarks), MIT licensed. This repository
keeps that license; see [LICENSE](LICENSE).

# Benchmarks

The `bench (fastify, single run)` workflow maintains this section. Until it has run, the table
is empty.
