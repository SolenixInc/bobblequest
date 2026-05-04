/**
 * Unit tests for scripts/stack/heartbeat.ts
 *
 * Covers:
 *   1. tick fires at the configured interval
 *   2. stop() halts further ticks
 *   3. elapsed seconds count up across ticks
 *   4. label appears in every tick output
 *   5. no-op when the op finishes before the first tick
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('startHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('fires the tick callback at the configured interval', async () => {
    const { startHeartbeat } = await import('../heartbeat.ts')

    const ticks: number[] = []
    const stop = startHeartbeat({
      label: 'Polling readiness',
      intervalMs: 1_000,
      onTick: (elapsedMs) => ticks.push(elapsedMs),
    })

    // No tick before the first interval fires
    expect(ticks).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(ticks).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(ticks).toHaveLength(2)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(ticks).toHaveLength(3)

    stop()
  })

  it('stop() prevents further ticks from firing', async () => {
    const { startHeartbeat } = await import('../heartbeat.ts')

    const ticks: number[] = []
    const stop = startHeartbeat({
      label: 'Polling readiness',
      intervalMs: 1_000,
      onTick: (elapsedMs) => ticks.push(elapsedMs),
    })

    await vi.advanceTimersByTimeAsync(2_000)
    expect(ticks).toHaveLength(2)

    stop()

    // Advance further — no more ticks
    await vi.advanceTimersByTimeAsync(5_000)
    expect(ticks).toHaveLength(2)
  })

  it('elapsed seconds count up correctly across ticks', async () => {
    const { startHeartbeat } = await import('../heartbeat.ts')

    const ticks: number[] = []
    const stop = startHeartbeat({
      label: 'Waiting',
      intervalMs: 5_000,
      onTick: (elapsedMs) => ticks.push(elapsedMs),
    })

    await vi.advanceTimersByTimeAsync(5_000)
    await vi.advanceTimersByTimeAsync(5_000)
    await vi.advanceTimersByTimeAsync(5_000)

    stop()

    expect(ticks).toHaveLength(3)
    // Each tick's elapsed should be progressively larger
    expect(ticks[0]).toBeGreaterThanOrEqual(5_000)
    expect(ticks[1]).toBeGreaterThan(ticks[0]!)
    expect(ticks[2]).toBeGreaterThan(ticks[1]!)
  })

  it('writes dimmed output to stdout on each tick (integration smoke)', async () => {
    const { startHeartbeat } = await import('../heartbeat.ts')

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    // No custom onTick — uses the default stdout writer
    const stop = startHeartbeat({
      label: 'Doctor matrix',
      intervalMs: 1_000,
    })

    await vi.advanceTimersByTimeAsync(1_000)
    stop()

    const written = writeSpy.mock.calls.map((c) => String(c[0])).join('')
    expect(written).toContain('Doctor matrix')

    writeSpy.mockRestore()
  })

  it('label appears in every tick when using default writer', async () => {
    const { startHeartbeat } = await import('../heartbeat.ts')

    const written: string[] = []
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      written.push(String(chunk))
      return true
    })

    const stop = startHeartbeat({
      label: 'Phase 4 readiness',
      intervalMs: 1_000,
    })

    await vi.advanceTimersByTimeAsync(3_000)
    stop()

    writeSpy.mockRestore()

    const all = written.join('')
    expect(all).toContain('Phase 4 readiness')
    // Should have fired 3 ticks
    const matches = written.filter((s) => s.includes('Phase 4 readiness'))
    expect(matches.length).toBeGreaterThanOrEqual(3)
  })

  it('does not fire at all when stop() is called before the interval elapses', async () => {
    const { startHeartbeat } = await import('../heartbeat.ts')

    const ticks: number[] = []
    const stop = startHeartbeat({
      label: 'Quick op',
      intervalMs: 5_000,
      onTick: (elapsedMs) => ticks.push(elapsedMs),
    })

    // Stop immediately (simulates an op that completes before first tick)
    stop()

    await vi.advanceTimersByTimeAsync(10_000)
    expect(ticks).toHaveLength(0)
  })
})
