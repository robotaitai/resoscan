/**
 * Tests for waterfall / cumulative spectral decay computation.
 */

import { describe, it, expect } from 'vitest'
import { computeWaterfall } from './waterfall'

const SAMPLE_RATE = 48_000

function makeSyntheticIR(durationSec: number): Float32Array {
  const len = Math.round(durationSec * SAMPLE_RATE)
  const ir = new Float32Array(len)
  ir[0] = 1
  const decay = 6.908 / 0.5 // ~0.5s RT60
  for (let i = 1; i < len; i++) {
    ir[i] = Math.exp((-decay * i) / SAMPLE_RATE) * Math.sin(i * 0.3)
  }
  return ir
}

describe('computeWaterfall', () => {
  it('returns the requested number of slices', () => {
    const ir = makeSyntheticIR(1)
    const result = computeWaterfall(ir, SAMPLE_RATE, { numSlices: 20 })
    expect(result.slices.length).toBe(20)
  })

  it('returns the requested number of frequency points', () => {
    const ir = makeSyntheticIR(1)
    const result = computeWaterfall(ir, SAMPLE_RATE, { numFreqPoints: 100 })
    expect(result.frequencies.length).toBe(100)
    expect(result.slices[0].magnitudeDb.length).toBe(100)
  })

  it('first slice has the highest energy', () => {
    const ir = makeSyntheticIR(1)
    const result = computeWaterfall(ir, SAMPLE_RATE)
    // Average dB of first slice should be higher than last slice
    const avgFirst =
      Array.from(result.slices[0].magnitudeDb).reduce((a, b) => a + b, 0) /
      result.slices[0].magnitudeDb.length
    const last = result.slices[result.slices.length - 1]
    const avgLast =
      Array.from(last.magnitudeDb).reduce((a, b) => a + b, 0) /
      last.magnitudeDb.length
    expect(avgFirst).toBeGreaterThan(avgLast)
  })

  it('slices have increasing time offsets', () => {
    const ir = makeSyntheticIR(1)
    const result = computeWaterfall(ir, SAMPLE_RATE)
    for (let i = 1; i < result.slices.length; i++) {
      expect(result.slices[i].timeSec).toBeGreaterThan(
        result.slices[i - 1].timeSec,
      )
    }
  })

  it('frequencies are in ascending order', () => {
    const ir = makeSyntheticIR(1)
    const result = computeWaterfall(ir, SAMPLE_RATE)
    for (let i = 1; i < result.frequencies.length; i++) {
      expect(result.frequencies[i]).toBeGreaterThan(result.frequencies[i - 1])
    }
  })

  it('maxDb is finite', () => {
    const ir = makeSyntheticIR(1)
    const result = computeWaterfall(ir, SAMPLE_RATE)
    expect(isFinite(result.maxDb)).toBe(true)
  })

  it('handles very short IR without crashing', () => {
    const ir = new Float32Array(64)
    ir[0] = 1
    const result = computeWaterfall(ir, SAMPLE_RATE, {
      numSlices: 5,
      windowSec: 0.01,
    })
    expect(result.slices.length).toBeGreaterThan(0)
  })

  it('no NaN values in magnitude data', () => {
    const ir = makeSyntheticIR(1)
    const result = computeWaterfall(ir, SAMPLE_RATE)
    for (const slice of result.slices) {
      for (let i = 0; i < slice.magnitudeDb.length; i++) {
        expect(isNaN(slice.magnitudeDb[i])).toBe(false)
      }
    }
  })
})
