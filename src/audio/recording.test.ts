import {
  concatChunks,
  computeRms,
  computePeak,
  detectClipping,
  computeChunkLevel,
  downsampleForWaveform,
} from './recording'

// ---------------------------------------------------------------------------
// concatChunks
// ---------------------------------------------------------------------------

describe('concatChunks', () => {
  it('returns empty Float32Array for no chunks', () => {
    const result = concatChunks([])
    expect(result).toBeInstanceOf(Float32Array)
    expect(result.length).toBe(0)
  })

  it('returns the same array for a single chunk', () => {
    const chunk = new Float32Array([1, 2, 3])
    const result = concatChunks([chunk])
    expect(result).toBe(chunk)
  })

  it('concatenates two chunks', () => {
    const a = new Float32Array([1, 2])
    const b = new Float32Array([3, 4, 5])
    const result = concatChunks([a, b])
    expect(result.length).toBe(5)
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5])
  })

  it('concatenates many chunks', () => {
    const chunks = Array.from({ length: 100 }, (_, i) => new Float32Array([i]))
    const result = concatChunks(chunks)
    expect(result.length).toBe(100)
    expect(result[0]).toBe(0)
    expect(result[99]).toBe(99)
  })

  it('handles chunks of different sizes', () => {
    const a = new Float32Array([1])
    const b = new Float32Array([2, 3, 4])
    const c = new Float32Array([5, 6])
    const result = concatChunks([a, b, c])
    expect(result.length).toBe(6)
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('preserves total sample count (simulated AudioWorklet chunks)', () => {
    const chunkSize = 128
    const numChunks = Math.ceil((48000 * 2) / chunkSize)
    const chunks = Array.from(
      { length: numChunks },
      () => new Float32Array(chunkSize),
    )
    const result = concatChunks(chunks)
    expect(result.length).toBe(numChunks * chunkSize)
  })
})

// ---------------------------------------------------------------------------
// computeRms
// ---------------------------------------------------------------------------

describe('computeRms', () => {
  it('returns 0 for empty buffer', () => {
    expect(computeRms(new Float32Array(0))).toBe(0)
  })

  it('returns 0 for silence', () => {
    expect(computeRms(new Float32Array(1000))).toBe(0)
  })

  it('computes correct RMS for DC signal', () => {
    const buffer = new Float32Array(100).fill(0.5)
    expect(computeRms(buffer)).toBeCloseTo(0.5)
  })

  it('computes correct RMS for a sine wave', () => {
    const N = 48000
    const buffer = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      buffer[i] = Math.sin((2 * Math.PI * 440 * i) / 48000)
    }
    // RMS of a full sine wave = 1/sqrt(2) ≈ 0.7071
    expect(computeRms(buffer)).toBeCloseTo(1 / Math.sqrt(2), 2)
  })
})

// ---------------------------------------------------------------------------
// computePeak
// ---------------------------------------------------------------------------

describe('computePeak', () => {
  it('returns 0 for empty buffer', () => {
    expect(computePeak(new Float32Array(0))).toBe(0)
  })

  it('returns 0 for silence', () => {
    expect(computePeak(new Float32Array(100))).toBe(0)
  })

  it('finds positive peak', () => {
    const buffer = new Float32Array([0.1, 0.5, 0.3])
    expect(computePeak(buffer)).toBeCloseTo(0.5)
  })

  it('finds negative peak', () => {
    const buffer = new Float32Array([0.1, -0.8, 0.3])
    expect(computePeak(buffer)).toBeCloseTo(0.8)
  })
})

// ---------------------------------------------------------------------------
// detectClipping
// ---------------------------------------------------------------------------

describe('detectClipping', () => {
  it('reports no clipping for quiet signal', () => {
    const buffer = new Float32Array(100).fill(0.5)
    const result = detectClipping(buffer)
    expect(result.clipped).toBe(false)
    expect(result.clippedSampleCount).toBe(0)
    expect(result.peak).toBeCloseTo(0.5)
  })

  it('detects clipping at +1.0', () => {
    const buffer = new Float32Array([0, 0.5, 1.0, 0.5, 0])
    const result = detectClipping(buffer)
    expect(result.clipped).toBe(true)
    expect(result.clippedSampleCount).toBe(1)
    expect(result.peak).toBeCloseTo(1.0)
  })

  it('detects clipping at -1.0', () => {
    const buffer = new Float32Array([0, -1.0, 0])
    const result = detectClipping(buffer)
    expect(result.clipped).toBe(true)
    expect(result.clippedSampleCount).toBe(1)
  })

  it('counts multiple clipped samples', () => {
    const buffer = new Float32Array([0.99, 1.0, -0.99, -1.0, 0.5])
    const result = detectClipping(buffer)
    expect(result.clipped).toBe(true)
    expect(result.clippedSampleCount).toBe(4)
  })

  it('handles empty buffer', () => {
    const result = detectClipping(new Float32Array(0))
    expect(result.clipped).toBe(false)
    expect(result.peak).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// downsampleForWaveform
// ---------------------------------------------------------------------------

describe('downsampleForWaveform', () => {
  it('returns empty for empty buffer', () => {
    const result = downsampleForWaveform(new Float32Array(0), 10)
    expect(result.length).toBe(0)
  })

  it('returns empty for 0 bars', () => {
    const result = downsampleForWaveform(new Float32Array(100), 0)
    expect(result.length).toBe(0)
  })

  it('returns correct number of bars', () => {
    const buffer = new Float32Array(1000)
    const result = downsampleForWaveform(buffer, 50)
    expect(result.length).toBe(50)
  })

  it('peak values are correct', () => {
    const buffer = new Float32Array([0.1, 0.5, 0.3, -0.9])
    const result = downsampleForWaveform(buffer, 2)
    expect(result[0]).toBeCloseTo(0.5)
    expect(result[1]).toBeCloseTo(0.9)
  })

  it('all values are non-negative', () => {
    const buffer = new Float32Array(1000)
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.sin(i * 0.1)
    }
    const result = downsampleForWaveform(buffer, 50)
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(0)
    }
  })
})

// ---------------------------------------------------------------------------
// computeChunkLevel (used by level meter)
// ---------------------------------------------------------------------------

describe('computeChunkLevel', () => {
  it('returns zeros for empty chunk', () => {
    const result = computeChunkLevel(new Float32Array(0))
    expect(result.rms).toBe(0)
    expect(result.peak).toBe(0)
    expect(result.clipping).toBe(false)
  })

  it('returns zeros for silent chunk', () => {
    const result = computeChunkLevel(new Float32Array(128))
    expect(result.rms).toBe(0)
    expect(result.peak).toBe(0)
    expect(result.clipping).toBe(false)
  })

  it('computes correct RMS for DC signal chunk', () => {
    const chunk = new Float32Array(128).fill(0.5)
    const result = computeChunkLevel(chunk)
    expect(result.rms).toBeCloseTo(0.5)
    expect(result.peak).toBeCloseTo(0.5)
    expect(result.clipping).toBe(false)
  })

  it('computes correct RMS for sine wave chunk', () => {
    const N = 128
    const chunk = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      chunk[i] = Math.sin((2 * Math.PI * 4 * i) / N) // 4 full cycles
    }
    // RMS of sine = 1/sqrt(2) ≈ 0.7071
    expect(computeChunkLevel(chunk).rms).toBeCloseTo(1 / Math.sqrt(2), 1)
  })

  it('detects peak correctly', () => {
    const chunk = new Float32Array([0, 0.1, -0.8, 0.3, 0])
    expect(computeChunkLevel(chunk).peak).toBeCloseTo(0.8)
  })

  it('detects clipping at threshold', () => {
    const chunk = new Float32Array([0, 0.5, 0.99, 0.5, 0])
    expect(computeChunkLevel(chunk).clipping).toBe(true)
  })

  it('detects clipping at 1.0', () => {
    const chunk = new Float32Array([0, 1.0, 0])
    expect(computeChunkLevel(chunk).clipping).toBe(true)
  })

  it('no clipping for signal below threshold', () => {
    const chunk = new Float32Array([0, 0.5, 0.98, 0.5, 0])
    expect(computeChunkLevel(chunk).clipping).toBe(false)
  })

  it('handles negative clipping', () => {
    const chunk = new Float32Array([0, -0.99, 0])
    expect(computeChunkLevel(chunk).clipping).toBe(true)
  })
})
