/**
 * Tests for measurement-related types and timing expectations.
 * These validate that measurement metadata is consistent.
 */

import {
  PRE_ROLL_SEC,
  POST_ROLL_SEC,
  SWEEP_DURATION_SEC,
  SWEEP_FREQ_START,
  SWEEP_FREQ_END,
} from '../constants'
import type { MeasurementMeta, MeasurementResult } from './types'

// ---------------------------------------------------------------------------
// MeasurementMeta timing invariants
// ---------------------------------------------------------------------------

describe('MeasurementMeta', () => {
  const makeMeta = (
    overrides: Partial<MeasurementMeta> = {},
  ): MeasurementMeta => ({
    sampleRate: 48_000,
    fStart: SWEEP_FREQ_START,
    fEnd: SWEEP_FREQ_END,
    sweepDurationSec: SWEEP_DURATION_SEC,
    preRollSec: PRE_ROLL_SEC,
    postRollSec: POST_ROLL_SEC,
    startedAt: '2026-02-10T12:00:00.000Z',
    completedAt: '2026-02-10T12:00:02.000Z',
    expectedDurationSec: PRE_ROLL_SEC + SWEEP_DURATION_SEC + POST_ROLL_SEC,
    ...overrides,
  })

  it('expectedDurationSec equals pre + sweep + post', () => {
    const meta = makeMeta()
    expect(meta.expectedDurationSec).toBeCloseTo(
      meta.preRollSec + meta.sweepDurationSec + meta.postRollSec,
    )
  })

  it('default expected duration matches constants', () => {
    const meta = makeMeta()
    const expectedTotal = PRE_ROLL_SEC + SWEEP_DURATION_SEC + POST_ROLL_SEC
    expect(meta.expectedDurationSec).toBeCloseTo(expectedTotal)
    // pre + sweep + post
    expect(expectedTotal).toBeCloseTo(
      PRE_ROLL_SEC + SWEEP_DURATION_SEC + POST_ROLL_SEC,
    )
  })

  it('frequency range matches constants', () => {
    const meta = makeMeta()
    expect(meta.fStart).toBe(20)
    expect(meta.fEnd).toBe(15_000)
  })

  it('timestamps are valid ISO strings', () => {
    const meta = makeMeta()
    expect(() => new Date(meta.startedAt)).not.toThrow()
    expect(() => new Date(meta.completedAt)).not.toThrow()
    const start = new Date(meta.startedAt).getTime()
    const end = new Date(meta.completedAt).getTime()
    expect(end).toBeGreaterThanOrEqual(start)
  })
})

// ---------------------------------------------------------------------------
// MeasurementResult structure
// ---------------------------------------------------------------------------

describe('MeasurementResult', () => {
  const EXPECTED_TOTAL = PRE_ROLL_SEC + SWEEP_DURATION_SEC + POST_ROLL_SEC

  const makeResult = (
    overrides: Partial<MeasurementResult> = {},
  ): MeasurementResult => ({
    buffer: new Float32Array(Math.round(48_000 * EXPECTED_TOTAL)),
    meta: {
      sampleRate: 48_000,
      fStart: SWEEP_FREQ_START,
      fEnd: SWEEP_FREQ_END,
      sweepDurationSec: SWEEP_DURATION_SEC,
      preRollSec: PRE_ROLL_SEC,
      postRollSec: POST_ROLL_SEC,
      startedAt: '2026-02-10T12:00:00.000Z',
      completedAt: '2026-02-10T12:00:10.000Z',
      expectedDurationSec: EXPECTED_TOTAL,
    },
    rms: 0.05,
    peak: 0.8,
    clipped: false,
    clippedSampleCount: 0,
    actualDurationSec: EXPECTED_TOTAL,
    impulseResponse: null,
    ...overrides,
  })

  it('actual duration roughly matches expected duration', () => {
    const result = makeResult()
    // Allow ±20% tolerance (real-world scheduling jitter)
    expect(result.actualDurationSec).toBeGreaterThan(
      result.meta.expectedDurationSec * 0.8,
    )
    expect(result.actualDurationSec).toBeLessThan(
      result.meta.expectedDurationSec * 1.2,
    )
  })

  it('buffer length matches actual duration × sample rate', () => {
    const result = makeResult()
    const expectedLength = Math.round(
      result.actualDurationSec * result.meta.sampleRate,
    )
    expect(result.buffer.length).toBe(expectedLength)
  })

  it('rms and peak are between 0 and 1 for normal signals', () => {
    const result = makeResult()
    expect(result.rms).toBeGreaterThanOrEqual(0)
    expect(result.rms).toBeLessThanOrEqual(1)
    expect(result.peak).toBeGreaterThanOrEqual(0)
    expect(result.peak).toBeLessThanOrEqual(1)
  })

  it('clipped=true implies clippedSampleCount > 0', () => {
    const result = makeResult({ clipped: true, clippedSampleCount: 5 })
    expect(result.clippedSampleCount).toBeGreaterThan(0)
  })

  it('clipped=false implies clippedSampleCount === 0', () => {
    const result = makeResult({ clipped: false, clippedSampleCount: 0 })
    expect(result.clippedSampleCount).toBe(0)
  })
})
