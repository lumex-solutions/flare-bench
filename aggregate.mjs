/**
 * Aggregates the per-sweep results under a runs directory into one record: for each
 * framework it computes the median, mean, spread, and coefficient of variation of
 * requests/s, latency, and throughput across the sweeps. It writes a timestamped JSON
 * into the history directory and prints a Markdown table to stdout.
 *
 * Usage: node aggregate.mjs [runsDir=runs] [historyDir=history]
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import { info } from './lib/packages.js'

const runsDir = process.argv[2] || 'runs'
const historyDir = process.argv[3] || 'history'

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
// Sample standard deviation; zero when a single sweep leaves nothing to vary.
const stddev = (xs) => {
  if (xs.length < 2) return 0
  const mu = mean(xs)
  return Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / (xs.length - 1))
}
const round = (x, d = 2) => Number(x.toFixed(d))

const runDirs = readdirSync(runsDir)
  .filter((n) => /^run-\d+$/.test(n) && statSync(join(runsDir, n)).isDirectory())
  .sort()

if (!runDirs.length) {
  console.error(`No run-NN folders found under ${runsDir}.`)
  process.exit(1)
}

// Frameworks are whatever the first sweep produced, so a registry change needs no edit here.
const frameworks = readdirSync(join(runsDir, runDirs[0]))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))

// samples[framework] = [{ requests, latency, throughputMb } per sweep]
const samples = Object.fromEntries(frameworks.map((f) => [f, []]))
for (const rd of runDirs) {
  for (const f of frameworks) {
    let raw
    try {
      raw = JSON.parse(readFileSync(join(runsDir, rd, `${f}.json`), 'utf8'))
    } catch {
      continue
    }
    samples[f].push({
      requests: raw.requests.average,
      latency: raw.latency.average,
      throughputMb: raw.throughput.average / 1024 / 1024
    })
  }
}

const summarize = (rows, key) => {
  const xs = rows.map((r) => r[key])
  const mu = mean(xs)
  const sd = stddev(xs)
  return {
    median: round(median(xs)),
    mean: round(mu),
    min: round(Math.min(...xs)),
    max: round(Math.max(...xs)),
    stddev: round(sd),
    cvPct: round((sd / mu) * 100)
  }
}

// Rank by median requests/s so a single noisy sweep cannot reorder the field.
const results = frameworks
  .map((f) => ({
    name: f,
    version: info(f)?.version ?? null,
    requests: summarize(samples[f], 'requests'),
    latencyMs: summarize(samples[f], 'latency'),
    throughputMb: summarize(samples[f], 'throughputMb')
  }))
  .sort((a, b) => b.requests.median - a.requests.median)

const runId = process.env.GITHUB_RUN_ID || 'local'
const record = {
  date: new Date().toISOString(),
  runId,
  commit: process.env.GITHUB_SHA || null,
  runner: process.env.RUNNER_NAME || process.env.RUNNER_OS || 'local',
  // Machine specs, so a reader can confirm the runner matches (fastify publishes from a
  // 4-vCPU / 16GB public-repo runner; a private repo gets a 2-vCPU / 7GB one).
  cpus: os.cpus().length,
  cpuModel: os.cpus()[0]?.model ?? null,
  memGB: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
  node: process.version,
  sweeps: runDirs.length,
  method: 'autocannon -c 100 -p 10 -d 40, one warm-up round and one measured round per framework',
  results
}

const stamp = record.date.slice(0, 10)
const outFile = join(historyDir, `${stamp}-${runId}.json`)
writeFileSync(outFile, JSON.stringify(record, null, 2))

// Markdown for the CI step summary. A plain table, ranked, medians as the headline figure.
const lines = []
lines.push(`## Benchmark results (${record.sweeps} sweeps, median)`)
lines.push('')
lines.push(`Node ${record.node} on ${record.runner} (${record.cpus} vCPU, ${record.memGB}GB). Method: ${record.method}.`)
lines.push('')
lines.push('| Framework | Version | Requests/s | Latency (ms) | Throughput (Mb/s) | CV% |')
lines.push('| :-- | --: | --: | --: | --: | --: |')
for (const r of results) {
  lines.push(`| ${r.name} | ${r.version ?? ''} | ${r.requests.median} | ${r.latencyMs.median} | ${r.throughputMb.median} | ${r.requests.cvPct}% |`)
}
lines.push('')
lines.push(`Saved: \`${outFile}\``)
console.log(lines.join('\n'))
