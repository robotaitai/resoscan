import { windowIR, computeMagnitudeResponse } from './frequencyResponse'

// ---------------------------------------------------------------------------
// windowIR
// ---------------------------------------------------------------------------

describe('windowIR', () => {
  it('returns the full IR when no maxDuration is given', () => {
    const ir = new Float32Array([1, 2, 3, 4, 5])
    const result = windowIR(ir, 48000)
    // Last 10% should have fade-out applied
    expect(result.length).toBe(5)
    expect(result[0]).toBe(1) // start untouched
  })

  it('truncates to the given duration', () => {
    const sampleRate = 1000
    const ir = new Float32Array(1000) // 1 second
    ir.fill(1)
    const result = windowIR(ir, sampleRate, 0.2) // 200 ms
    expect(result.length).toBe(200)
  })

  it('applies a fade-out at the end', () => {
    const ir = new Float32Array(100).fill(1)
    const result = windowIR(ir, 1000, undefined, 0.2) // 20% fade
    // First 80% should be untouched
    expect(result[0]).toBe(1)
    expect(result[79]).toBe(1)
    // The very last sample should be very small (near 0)
    expect(result[99]).toBeLessThan(0.02)
    // Midpoint of fade should be around 0.5 (index 90 = centre of 80..99)
    expect(result[90]).toBeCloseTo(0.5, 0)
  })

  it('handles empty IR', () => {
    const result = windowIR(new Float32Array(0), 48000, 0.1)
    expect(result.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// computeMagnitudeResponse
// ---------------------------------------------------------------------------

describe('computeMagnitudeResponse', () => {
  it('returns empty for empty signal', () => {
    const result = computeMagnitudeResponse(
      new Float32Array(0),
      48000,
      20,
      15000,
      100,
    )
    expect(result).toEqual([])
  })

  it('returns empty for zero numPoints', () => {
    const result = computeMagnitudeResponse(
      new Float32Array(1024),
      48000,
      20,
      15000,
      0,
    )
    expect(result).toEqual([])
  })

  it('returns the correct number of points', () => {
    const signal = new Float32Array(1024)
    signal[0] = 1 // delta
    const result = computeMagnitudeResponse(signal, 48000, 20, 15000, 200)
    expect(result.length).toBe(200)
  })

  it('frequency axis is logarithmically spaced', () => {
    const signal = new Float32Array(1024)
    signal[0] = 1
    const result = computeMagnitudeResponse(signal, 48000, 20, 15000, 100)

    // First point should be near 20 Hz
    expect(result[0].freq).toBeCloseTo(20, 0)
    // Last point should be near 15000 Hz
    expect(result[99].freq).toBeCloseTo(15000, 0)

    // Check log spacing: ratio between consecutive points should be roughly constant
    const ratio1 = result[1].freq / result[0].freq
    const ratio50 = result[51].freq / result[50].freq
    expect(ratio1).toBeCloseTo(ratio50, 2)
  })

  it('delta impulse has flat magnitude response (within tolerance)', () => {
    const N = 4096
    const signal = new Float32Array(N)
    signal[0] = 1 // perfect delta
    const result = computeMagnitudeResponse(signal, 48000, 100, 10000, 100)

    // A delta function should have flat magnitude = 0 dB
    for (const point of result) {
      expect(point.db).toBeCloseTo(0, 0) // within 1 dB
    }
  })

  it('pure sine has a peak near its frequency', () => {
    const sampleRate = 48000
    const N = 8192
    const signal = new Float32Array(N)
    const targetFreq = 1000
    for (let i = 0; i < N; i++) {
      signal[i] = Math.sin((2 * Math.PI * targetFreq * i) / sampleRate)
    }

    const result = computeMagnitudeResponse(signal, sampleRate, 20, 15000, 500)

    // Find the peak
    let maxDb = -Infinity
    let peakFreq = 0
    for (const point of result) {
      if (point.db > maxDb) {
        maxDb = point.db
        peakFreq = point.freq
      }
    }

    // Peak should be within 5% of target frequency
    expect(Math.abs(peakFreq - targetFreq) / targetFreq).toBeLessThan(0.05)
  })

  it('contains no NaN values for silent signal', () => {
    const signal = new Float32Array(1024) // all zeros
    const result = computeMagnitudeResponse(signal, 48000, 20, 15000, 100)
    for (const point of result) {
      expect(Number.isNaN(point.db)).toBe(false)
      expect(Number.isNaN(point.freq)).toBe(false)
    }
  })

  it('silent signal dB values are clamped (not -Infinity)', () => {
    const signal = new Float32Array(1024)
    const result = computeMagnitudeResponse(signal, 48000, 20, 15000, 100)
    for (const point of result) {
      expect(Number.isFinite(point.db)).toBe(true)
      expect(point.db).toBe(-120)
    }
  })
})
