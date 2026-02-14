/**
 * Tests for RT60 estimation.
 */

import { describe, it, expect } from 'vitest'
import { estimateRT60, computeEDC } from './rt60'

const SAMPLE_RATE = 48_000

/** Create an exponentially decaying impulse (white noise envelope). */
function makeSyntheticIR(rt60Sec: number, durationSec: number): Float32Array {
  const len = Math.round(durationSec * SAMPLE_RATE)
  const ir = new Float32Array(len)
  // Decay constant: amplitude drops by 60 dB in rt60Sec
  // 60 dB = factor of 1e-3, so decay = -ln(1e-3)/rt60 = 6.908/rt60
  const decayRate = 6.908 / rt60Sec
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE
    const envelope = Math.exp(-decayRate * t)
    // Use deterministic pseudo-random noise
    ir[i] = envelope * (Math.sin(i * 0.7 + i * i * 0.001) * 0.5 + 0.5 - 0.25)
  }
  // Ensure a strong initial peak
  ir[0] = 1
  return ir
}

describe('estimateRT60', () => {
  it('returns null for empty or tiny IR', () => {
    expect(estimateRT60(new Float32Array(0), SAMPLE_RATE)).toBeNull()
    expect(estimateRT60(new Float32Array(1), SAMPLE_RATE)).toBeNull()
  })

  it('returns null for silent IR', () => {
    const silent = new Float32Array(SAMPLE_RATE)
    expect(estimateRT60(silent, SAMPLE_RATE)).toBeNull()
  })

  it('estimates RT60 within 30% for a 0.5s synthetic decay', () => {
    const ir = makeSyntheticIR(0.5, 2)
    const result = estimateRT60(ir, SAMPLE_RATE)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.rt60).toBeGreaterThan(0.5 * 0.7)
      expect(result.rt60).toBeLessThan(0.5 * 1.3)
    }
  })

  it('estimates RT60 within 30% for a 1.0s synthetic decay', () => {
    const ir = makeSyntheticIR(1.0, 3)
    const result = estimateRT60(ir, SAMPLE_RATE)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.rt60).toBeGreaterThan(1.0 * 0.7)
      expect(result.rt60).toBeLessThan(1.0 * 1.3)
    }
  })

  it('estimates RT60 within 30% for a 2.0s synthetic decay', () => {
    const ir = makeSyntheticIR(2.0, 6)
    const result = estimateRT60(ir, SAMPLE_RATE)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.rt60).toBeGreaterThan(2.0 * 0.7)
      expect(result.rt60).toBeLessThan(2.0 * 1.3)
    }
  })

  it('result contains a valid EDC', () => {
    const ir = makeSyntheticIR(1.0, 3)
    const result = estimateRT60(ir, SAMPLE_RATE)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.edcDb.length).toBe(ir.length)
      expect(result.edcDb[0]).toBeCloseTo(0, 0) // starts at 0 dB
      // EDC should be monotonically non-increasing
      for (let i = 1; i < result.edcDb.length; i++) {
        expect(result.edcDb[i]).toBeLessThanOrEqual(result.edcDb[i - 1] + 0.01)
      }
    }
  })

  it('t20 is positive', () => {
    const ir = makeSyntheticIR(1.0, 3)
    const result = estimateRT60(ir, SAMPLE_RATE)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.t20).toBeGreaterThan(0)
    }
  })

  it('noise floor is negative', () => {
    const ir = makeSyntheticIR(1.0, 3)
    const result = estimateRT60(ir, SAMPLE_RATE)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.noiseFloorDb).toBeLessThan(0)
    }
  })
})

describe('computeEDC', () => {
  it('returns array of same length as input', () => {
    const ir = new Float32Array(100)
    ir[0] = 1
    const edc = computeEDC(ir)
    expect(edc.length).toBe(100)
  })

  it('starts at 0 dB for non-silent IR', () => {
    const ir = makeSyntheticIR(0.5, 1)
    const edc = computeEDC(ir)
    expect(edc[0]).toBeCloseTo(0, 0)
  })

  it('is monotonically non-increasing', () => {
    const ir = makeSyntheticIR(0.5, 1)
    const edc = computeEDC(ir)
    for (let i = 1; i < edc.length; i++) {
      expect(edc[i]).toBeLessThanOrEqual(edc[i - 1] + 0.01)
    }
  })
})
