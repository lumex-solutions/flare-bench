import pkgJson from '../package.json' with { type: 'json' }
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const packages = {
  express: { hasRouter: true },
  fastify: { checked: true, hasRouter: true },
  flare: { hasRouter: true, package: '@flare-ts/core' },
  hono: { hasRouter: true, package: 'hono' },
  'node-http': { version: process.version },
}

const _choices = []
Object.keys(packages).forEach(pkg => {
  if (!packages[pkg].version) {
    const module = pkgJson.dependencies[pkg] ? pkg : packages[pkg].package
    const version = require(resolve(`node_modules/${module}/package.json`)).version
    packages[pkg].version = version
  }
  _choices.push(pkg)
})

export const choices = _choices.sort()
export function list(extra = false) {
  return _choices
    .map(c => {
      return extra === !!packages[c].extra
        ? Object.assign({}, packages[c], { name: c })
        : null
    })
    .filter(c => c)
}
export function info(module) {
  return packages[module]
}
