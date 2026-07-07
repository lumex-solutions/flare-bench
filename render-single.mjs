/**
 * Renders benchmark-results.json (written by `benchmark compare -t`) into the single-run
 * section of README.md, between its markers. This keeps the fastify compare tool unmodified
 * while giving this repo control over the README layout, instead of its `# Benchmarks` writer.
 *
 * Usage: node render-single.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'

const START = '<!-- results:single:start -->'
const END = '<!-- results:single:end -->'

let results
try {
  results = JSON.parse(readFileSync('benchmark-results.json', 'utf8'))
} catch {
  process.exit(0)
}

const cpus = os.cpus().length
const memGB = Number((os.totalmem() / 1024 ** 3).toFixed(1))
const table = [
  `_${new Date().toISOString().slice(0, 10)} - Node ${process.version} - ${cpus} vCPU, ${memGB}GB - single run_`,
  '',
  '| Framework | Version | Requests/s | Latency (ms) | Throughput (Mb/s) |',
  '| :-- | --: | --: | --: | --: |',
  ...results.map((r) => `| ${r.name} | ${r.version} | ${r.requests} | ${r.latency} | ${r.throughput} |`)
].join('\n')

const md = readFileSync('README.md', 'utf8')
const s = md.indexOf(START)
const e = md.indexOf(END)
if (s !== -1 && e !== -1 && e > s) {
  writeFileSync('README.md', md.slice(0, s) + `${START}\n\n${table}\n\n${END}` + md.slice(e + END.length))
}
