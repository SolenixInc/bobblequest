/**
 * Coverage summary parser.
 *
 * Walks packages coverage-summary.json files (v8 reporter format)
 * and returns per-package + aggregate coverage percentages.
 *
 * Handles missing files gracefully — packages without coverage are skipped.
 */

import { join } from 'node:path'

export type CoverageMetrics = {
  statements: number
  branches: number
  functions: number
  lines: number
}

export type PackageCoverage = {
  package: string
  metrics: CoverageMetrics
}

export type CoverageSummaryResult = {
  packages: PackageCoverage[]
  aggregate: CoverageMetrics
  /** Total packages found with coverage data */
  count: number
}

type V8CoverageTotal = {
  total: number
  covered: number
  skipped: number
  pct: number
}

type V8CoverageSummary = {
  total?: {
    statements?: V8CoverageTotal
    branches?: V8CoverageTotal
    functions?: V8CoverageTotal
    lines?: V8CoverageTotal
  }
}

function extractPct(val: V8CoverageTotal | undefined): number {
  if (!val) return 0
  if (typeof val.pct === 'number' && Number.isFinite(val.pct)) return val.pct
  if (val.total === 0) return 100 // nothing to cover
  return 0
}

/**
 * Read coverage data for all packages under `packagesDir`.
 *
 * @param repoRoot  Absolute path to repo root
 * @param packagesGlob  Glob sub-paths to scan; defaults to `packages/*`
 */
export async function readCoverageSummary(repoRoot: string): Promise<CoverageSummaryResult> {
  const packagesDir = join(repoRoot, 'packages')
  const packages: PackageCoverage[] = []

  // Use Bun's glob to find all coverage-summary.json files
  const glob = new Bun.Glob('*/coverage/coverage-summary.json')

  for await (const rel of glob.scan({ cwd: packagesDir })) {
    const fullPath = join(packagesDir, rel)
    const packageName = rel.split('/')[0]

    try {
      const file = Bun.file(fullPath)
      const raw: V8CoverageSummary = await file.json()
      const total = raw.total

      if (!total) continue

      packages.push({
        package: packageName,
        metrics: {
          statements: extractPct(total.statements),
          branches: extractPct(total.branches),
          functions: extractPct(total.functions),
          lines: extractPct(total.lines),
        },
      })
    } catch {
      // Missing or malformed — skip silently
    }
  }

  // Aggregate: simple average across packages that have data
  const count = packages.length
  const aggregate: CoverageMetrics =
    count === 0
      ? { statements: 0, branches: 0, functions: 0, lines: 0 }
      : {
          statements: avg(packages.map((p) => p.metrics.statements)),
          branches: avg(packages.map((p) => p.metrics.branches)),
          functions: avg(packages.map((p) => p.metrics.functions)),
          lines: avg(packages.map((p) => p.metrics.lines)),
        }

  return { packages, aggregate, count }
}

/**
 * Median of `values` (more representative than mean for coverage %).
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}
