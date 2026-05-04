#!/usr/bin/env bun
/**
 * CLI entry point for docker artifact cleanup.
 *
 * Usage:
 *   bun run scripts/stack/run-cleanup.ts <tier> [--force]
 *
 * tier: 'soft' | 'volumes' | 'nuke'
 *
 * --force skips the interactive confirmation prompt for the nuke tier
 *         (required for CI or scripted invocations).
 */

import { pruneDocker } from './cleanup.ts'
import type { CleanupTier } from './cleanup.ts'

const VALID_TIERS: CleanupTier[] = ['soft', 'volumes', 'nuke']

const tierArg = process.argv[2]
if (!tierArg || !VALID_TIERS.includes(tierArg as CleanupTier)) {
  console.error(`[cleanup] Usage: bun run run-cleanup.ts <soft|volumes|nuke> [--force]`)
  process.exit(1)
}

const tier = tierArg as CleanupTier
const force = process.argv.includes('--force')

const result = await pruneDocker(tier, { force })
console.log(`\n[cleanup] Done. ${result.summary}`)
