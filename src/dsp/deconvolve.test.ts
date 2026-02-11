/**
 * Golden synthetic test for deconvolution.
 *
 * Strategy:
 *   1. Create a known fake impulse response as a sum of decaying sinusoids.
 *   2. Generate a sweep and its inverse filter.
 *   3. Simulate a recording: recording = convolve(sweep, fakeIR).
 *   4. Deconvolve: recoveredIR = extractImpulseResponse(recording, inverse).
 *   5. Verify that the recovered IR has a clear peak, correct length,
 *      and that its dominant frequencies match the original.
 */

import { generateLogSweep, generateInverseFilter } from './sweep'
import type { SweepParams } from './sweep'
import { convolve } from './convolve'
import { extractImpulseResponse, findPeakIndex } from './deconvolve'
import { fft, nextPowerOfTwo, realToComplex } from './fft'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a synthetic impulse response: sum of exponentially decaying sinusoids.
 * This mimics resonances at 55 Hz, 110 Hz, and 220 Hz.
 */
function createFakeIR(sampleRate: number, durationSec: number): Float32Array {
  const N = Math.round(sampleRate * durationSec)
  const ir = new Float32Array(N)

  // Three resonances with enough amplitude and slow enough decay
  // to remain visible in a short analysis window.
  const resonances = [
    { freq: 55, amp: 1.0, decay: 4 },
    { freq: 110, amp: 0.8, decay: 4 },
    { freq: 220, amp: 0.6, decay: 4 },
  ]

  for (let n = 0; n < N; n++) {
    const t = n / sampleRate
    let sample = 0
    for (const { freq, amp, decay } of resonances) {
      sample += amp * Math.exp(-decay * t) * Math.sin(2 * Math.PI * freq * t)
    }
    ir[n] = sample
  }

  // Normalise
  let maxAbs = 0
  for (let i = 0; i < N; i++) {
    const abs = Math.abs(ir[i])
    if (abs > maxAbs) maxAbs = abs
  }
  if (maxAbs > 0) {
    for (let i = 0; i < N; i++) {
      ir[i] /= maxAbs
    }
  }

  return ir
}

/**
 * Compute the magnitude at a specific frequency in a signal's spectrum.
 * Uses the nearest FFT bin.
 */
function magnitudeAtFrequency(
  signal: Float32Array,
  sampleRate: number,
  targetFreq: number,
): number {
  const N = nextPowerOfTwo(signal.length)
  const { re, im } = realToComplex(signal, N)
  fft(re, im)

  const bin = Math.round((targetFreq * N) / sampleRate)
  return Math.sqrt(re[bin] * re[bin] + im[bin] * im[bin])
}

/**
 * Compute the median magnitude across all positive-frequency bins.
 */
function medianMagnitude(signal: Float32Array): number {
  const N = nextPowerOfTwo(signal.length)
  const { re, im } = realToComplex(signal, N)
  fft(re, im)

  const halfN = N / 2
  const mags: number[] = []
  for (let i = 1; i < halfN; i++) {
    mags.push(Math.sqrt(re[i] * re[i] + im[i] * im[i]))
  }
  mags.sort((a, b) => a - b)
  return mags[Math.floor(mags.length / 2)]
}

// ---------------------------------------------------------------------------
// findPeakIndex
// ---------------------------------------------------------------------------

describe('findPeakIndex', () => {
  it('returns 0 for empty buffer', () => {
    expect(findPeakIndex(new Float32Array(0))).toBe(0)
  })

  it('finds positive peak', () => {
    const buf = new Float32Array([0, 0.1, 0.9, 0.3, 0])
    expect(findPeakIndex(buf)).toBe(2)
  })

  it('finds negative peak (absolute value)', () => {
    const buf = new Float32Array([0, 0.1, -0.95, 0.3, 0])
    expect(findPeakIndex(buf)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Golden synthetic test
// ---------------------------------------------------------------------------

describe('extractImpulseResponse — golden synthetic test', () => {
  const sampleRate = 8000 // Use a low sample rate for fast tests
  const sweepParams: SweepParams = {
    fStart: 20,
    fEnd: 3000, // Well below Nyquist (4000)
    durationSec: 0.5,
    sampleRate,
    fadeInSec: 0.005,
    fadeOutSec: 0.005,
  }

  const fakeIR = createFakeIR(sampleRate, 0.2)
  const sweep = generateLogSweep(sweepParams)
  const inverse = generateInverseFilter(sweepParams)

  // Simulate recording = convolve(sweep, fakeIR)
  const simulatedRecording = convolve(sweep, fakeIR)

  // Deconvolve
  const {
    ir: recoveredIR,
    peakIndex,
    rawPeak,
  } = extractImpulseResponse(simulatedRecording, inverse)

  it('recovered IR has non-zero length', () => {
    expect(recoveredIR.length).toBeGreaterThan(0)
  })

  it('recovered IR starts with peak at index 0 (auto-aligned)', () => {
    // The peak should be at index 0 after alignment
    expect(Math.abs(recoveredIR[0])).toBeCloseTo(1.0, 1)
  })

  it('peakIndex is within the convolution output', () => {
    const convLen = simulatedRecording.length + inverse.length - 1
    expect(peakIndex).toBeGreaterThanOrEqual(0)
    expect(peakIndex).toBeLessThan(convLen)
  })

  it('rawPeak is positive', () => {
    expect(rawPeak).toBeGreaterThan(0)
  })

  it('recovered IR contains no NaN values', () => {
    for (let i = 0; i < recoveredIR.length; i++) {
      expect(Number.isNaN(recoveredIR[i])).toBe(false)
    }
  })

  it('recovered IR decays over time (energy in first half > second half)', () => {
    const mid = Math.floor(recoveredIR.length / 2)
    let energyFirst = 0
    let energySecond = 0
    for (let i = 0; i < mid; i++) {
      energyFirst += recoveredIR[i] * recoveredIR[i]
    }
    for (let i = mid; i < recoveredIR.length; i++) {
      energySecond += recoveredIR[i] * recoveredIR[i]
    }
    expect(energyFirst).toBeGreaterThan(energySecond)
  })

  it('dominant frequencies of recovered IR match the fake IR resonances', () => {
    // Trim recovered IR to a reasonable length for analysis
    const analysisLength = Math.min(recoveredIR.length, sampleRate * 0.3)
    const trimmed = recoveredIR.slice(0, analysisLength)

    const median = medianMagnitude(trimmed)

    // Each resonant frequency should have magnitude well above the median.
    // The log sweep naturally puts more energy at low frequencies, so
    // we use a relative threshold rather than checking top-N bins.
    const expectedFreqs = [55, 110, 220]
    for (const freq of expectedFreqs) {
      const mag = magnitudeAtFrequency(trimmed, sampleRate, freq)
      // Each resonance should be at least 3× the median noise floor
      expect(mag).toBeGreaterThan(median * 3)
    }
  })

  it('works with maxLengthSamples to trim output', () => {
    const maxLen = 500
    const { ir: trimmedIR } = extractImpulseResponse(
      simulatedRecording,
      inverse,
      maxLen,
    )
    expect(trimmedIR.length).toBeLessThanOrEqual(maxLen)
    expect(Math.abs(trimmedIR[0])).toBeCloseTo(1.0, 1)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('extractImpulseResponse — edge cases', () => {
  it('handles a pure delta IR (identity convolution)', () => {
    const sampleRate = 4000
    const params: SweepParams = {
      fStart: 20,
      fEnd: 1500,
      durationSec: 0.25,
      sampleRate,
    }
    const sweep = generateLogSweep(params)
    const inverse = generateInverseFilter(params)

    // Recording = sweep * delta = sweep itself
    // Deconvolution should give ~delta
    const { ir } = extractImpulseResponse(sweep, inverse)

    // The peak should be very close to 1.0 at index 0
    expect(Math.abs(ir[0])).toBeCloseTo(1.0, 1)

    // The rest should be much smaller (this is a delta-ish result)
    let tailEnergy = 0
    for (let i = 10; i < Math.min(ir.length, 500); i++) {
      tailEnergy += ir[i] * ir[i]
    }
    const peakEnergy = ir[0] * ir[0]
    // Tail energy should be much less than peak
    expect(tailEnergy / 500).toBeLessThan(peakEnergy * 0.1)
  })
})
