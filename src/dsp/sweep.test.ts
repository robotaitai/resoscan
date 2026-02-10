import {
  generateLogSweep,
  generateInverseFilter,
  estimateInstantaneousFrequency,
} from './sweep'
import type { SweepParams } from './sweep'

/** Standard test params: 20 Hz → 15 kHz, 1 s, 48 kHz. */
const defaultParams: SweepParams = {
  fStart: 20,
  fEnd: 15000,
  durationSec: 1,
  sampleRate: 48000,
}

// ---------------------------------------------------------------------------
// generateLogSweep
// ---------------------------------------------------------------------------

describe('generateLogSweep', () => {
  it('produces output of length duration * sampleRate', () => {
    const sweep = generateLogSweep(defaultParams)
    expect(sweep.length).toBe(48000)
  })

  it('produces correct length for fractional durations', () => {
    const sweep = generateLogSweep({ ...defaultParams, durationSec: 0.5 })
    expect(sweep.length).toBe(24000)
  })

  it('returns a Float32Array', () => {
    const sweep = generateLogSweep(defaultParams)
    expect(sweep).toBeInstanceOf(Float32Array)
  })

  it('contains no NaN values', () => {
    const sweep = generateLogSweep(defaultParams)
    for (let i = 0; i < sweep.length; i++) {
      expect(Number.isNaN(sweep[i])).toBe(false)
    }
  })

  it('contains no values exceeding [-1, 1]', () => {
    const sweep = generateLogSweep(defaultParams)
    let max = 0
    for (let i = 0; i < sweep.length; i++) {
      const abs = Math.abs(sweep[i])
      if (abs > max) max = abs
    }
    expect(max).toBeLessThanOrEqual(1.0)
  })

  it('starts near zero due to fade-in', () => {
    const sweep = generateLogSweep(defaultParams)
    // First sample should be 0 (fade-in starts at 0)
    expect(Math.abs(sweep[0])).toBeCloseTo(0, 3)
  })

  it('ends near zero due to fade-out', () => {
    const sweep = generateLogSweep(defaultParams)
    expect(Math.abs(sweep[sweep.length - 1])).toBeCloseTo(0, 3)
  })

  it('starts near fStart frequency', () => {
    const sweep = generateLogSweep({
      ...defaultParams,
      durationSec: 2,
      fadeInSec: 0,
    })
    // Measure frequency near the start (skip a small offset to be in steady state)
    const freq = estimateInstantaneousFrequency(
      sweep,
      1000, // ~21 ms in
      defaultParams.sampleRate,
      512,
    )
    // Should be roughly near 20 Hz — allow wide tolerance for zero-crossing method
    expect(freq).toBeGreaterThan(10)
    expect(freq).toBeLessThan(60)
  })

  it('ends near fEnd frequency', () => {
    const sweep = generateLogSweep({
      ...defaultParams,
      durationSec: 2,
      fadeOutSec: 0,
    })
    const numSamples = sweep.length
    const freq = estimateInstantaneousFrequency(
      sweep,
      numSamples - 1000,
      defaultParams.sampleRate,
      512,
    )
    // Should be roughly near 15000 Hz
    expect(freq).toBeGreaterThan(10000)
    expect(freq).toBeLessThan(20000)
  })

  it('frequency increases monotonically (spot check 3 points)', () => {
    const sweep = generateLogSweep({
      ...defaultParams,
      durationSec: 2,
      fadeInSec: 0,
      fadeOutSec: 0,
    })
    const sr = defaultParams.sampleRate
    const n = sweep.length

    const f1 = estimateInstantaneousFrequency(sweep, Math.round(n * 0.1), sr)
    const f2 = estimateInstantaneousFrequency(sweep, Math.round(n * 0.5), sr)
    const f3 = estimateInstantaneousFrequency(sweep, Math.round(n * 0.9), sr)

    expect(f2).toBeGreaterThan(f1)
    expect(f3).toBeGreaterThan(f2)
  })

  describe('fade parameters', () => {
    it('no fade produces non-zero start', () => {
      const sweep = generateLogSweep({
        ...defaultParams,
        fadeInSec: 0,
        fadeOutSec: 0,
      })
      // With no fade, the sweep is sin(0) = 0 at sample 0, but sample 1 should
      // be non-negligible
      expect(Math.abs(sweep[1])).toBeGreaterThan(0.0001)
    })

    it('long fade-in attenuates early samples', () => {
      const sweep = generateLogSweep({
        ...defaultParams,
        fadeInSec: 0.1,
        fadeOutSec: 0,
      })
      // Sample ~100 (about 2 ms in) should be attenuated by the fade
      const earlyMax = Math.max(
        ...Array.from(sweep.slice(0, 100)).map(Math.abs),
      )
      const midMax = Math.max(
        ...Array.from(sweep.slice(24000, 24100)).map(Math.abs),
      )
      expect(earlyMax).toBeLessThan(midMax)
    })
  })

  describe('validation', () => {
    it('throws for fStart <= 0', () => {
      expect(() => generateLogSweep({ ...defaultParams, fStart: 0 })).toThrow(
        'fStart must be > 0',
      )
    })

    it('throws for fEnd <= fStart', () => {
      expect(() =>
        generateLogSweep({ ...defaultParams, fStart: 1000, fEnd: 500 }),
      ).toThrow('fEnd must be > fStart')
    })

    it('throws for durationSec <= 0', () => {
      expect(() =>
        generateLogSweep({ ...defaultParams, durationSec: 0 }),
      ).toThrow('durationSec must be > 0')
    })

    it('throws for sampleRate <= 0', () => {
      expect(() =>
        generateLogSweep({ ...defaultParams, sampleRate: 0 }),
      ).toThrow('sampleRate must be > 0')
    })

    it('throws when fEnd > Nyquist', () => {
      expect(() =>
        generateLogSweep({ ...defaultParams, fEnd: 25000, sampleRate: 48000 }),
      ).toThrow('Nyquist')
    })
  })
})

// ---------------------------------------------------------------------------
// generateInverseFilter
// ---------------------------------------------------------------------------

describe('generateInverseFilter', () => {
  it('produces output with same length as the sweep', () => {
    const sweep = generateLogSweep(defaultParams)
    const inverse = generateInverseFilter(defaultParams)
    expect(inverse.length).toBe(sweep.length)
  })

  it('returns a Float32Array', () => {
    const inverse = generateInverseFilter(defaultParams)
    expect(inverse).toBeInstanceOf(Float32Array)
  })

  it('contains no NaN values', () => {
    const inverse = generateInverseFilter(defaultParams)
    for (let i = 0; i < inverse.length; i++) {
      expect(Number.isNaN(inverse[i])).toBe(false)
    }
  })

  it('is normalised to peak magnitude 1', () => {
    const inverse = generateInverseFilter(defaultParams)
    let maxAbs = 0
    for (let i = 0; i < inverse.length; i++) {
      const a = Math.abs(inverse[i])
      if (a > maxAbs) maxAbs = a
    }
    expect(maxAbs).toBeCloseTo(1.0, 2)
  })

  it('contains no values exceeding [-1, 1]', () => {
    const inverse = generateInverseFilter(defaultParams)
    for (let i = 0; i < inverse.length; i++) {
      expect(Math.abs(inverse[i])).toBeLessThanOrEqual(1.0001) // float tolerance
    }
  })

  it('has different amplitude distribution than the raw sweep', () => {
    // The inverse filter has an exponential amplitude envelope,
    // so its RMS should differ from a uniform-amplitude sweep.
    const sweep = generateLogSweep({
      ...defaultParams,
      fadeInSec: 0,
      fadeOutSec: 0,
    })
    const inverse = generateInverseFilter(defaultParams)

    const rms = (buf: Float32Array) => {
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      return Math.sqrt(sum / buf.length)
    }

    // They shouldn't have the same RMS because of the amplitude envelope
    const sweepRms = rms(sweep)
    const inverseRms = rms(inverse)
    expect(Math.abs(sweepRms - inverseRms)).toBeGreaterThan(0.01)
  })
})

// ---------------------------------------------------------------------------
// estimateInstantaneousFrequency
// ---------------------------------------------------------------------------

describe('estimateInstantaneousFrequency', () => {
  it('estimates frequency of a pure sine wave', () => {
    const sampleRate = 48000
    const freq = 1000
    const numSamples = 4800
    const buffer = new Float32Array(numSamples)
    for (let i = 0; i < numSamples; i++) {
      buffer[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate)
    }

    const estimated = estimateInstantaneousFrequency(
      buffer,
      Math.round(numSamples / 2),
      sampleRate,
      512,
    )

    // Zero-crossing method should be within ~5% for a clean sine
    expect(estimated).toBeGreaterThan(950)
    expect(estimated).toBeLessThan(1050)
  })

  it('estimates a low frequency (100 Hz)', () => {
    const sampleRate = 48000
    const freq = 100
    const numSamples = 48000
    const buffer = new Float32Array(numSamples)
    for (let i = 0; i < numSamples; i++) {
      buffer[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate)
    }

    const estimated = estimateInstantaneousFrequency(
      buffer,
      24000,
      sampleRate,
      2048,
    )

    expect(estimated).toBeGreaterThan(90)
    expect(estimated).toBeLessThan(110)
  })
})
