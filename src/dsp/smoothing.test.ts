import { smoothFrequencyResponse, smoothingOptionToFraction } from './smoothing'
import type { FrequencyPoint } from './frequencyResponse'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a simple log-spaced frequency response for testing. */
function makePoints(numPoints: number, dbValue: number): FrequencyPoint[] {
  const result: FrequencyPoint[] = []
  for (let i = 0; i < numPoints; i++) {
    const freq = 20 * Math.pow(15000 / 20, i / (numPoints - 1))
    result.push({ freq, db: dbValue })
  }
  return result
}

/** Create a frequency response with a single peak. */
function makePointsWithPeak(
  numPoints: number,
  peakIndex: number,
  peakDb: number,
  baseDb: number,
): FrequencyPoint[] {
  const result: FrequencyPoint[] = []
  for (let i = 0; i < numPoints; i++) {
    const freq = 20 * Math.pow(15000 / 20, i / (numPoints - 1))
    result.push({ freq, db: i === peakIndex ? peakDb : baseDb })
  }
  return result
}

// ---------------------------------------------------------------------------
// smoothFrequencyResponse
// ---------------------------------------------------------------------------

describe('smoothFrequencyResponse', () => {
  it('returns input unchanged for fraction = 0', () => {
    const points = makePoints(100, -10)
    const result = smoothFrequencyResponse(points, 0)
    expect(result).toBe(points) // same reference
  })

  it('returns input unchanged for undefined fraction', () => {
    const points = makePoints(100, -10)
    const result = smoothFrequencyResponse(points)
    expect(result).toBe(points)
  })

  it('returns empty for empty input', () => {
    const result = smoothFrequencyResponse([], 1 / 6)
    expect(result).toEqual([])
  })

  it('output has the same length as input', () => {
    const points = makePoints(200, -10)
    const result = smoothFrequencyResponse(points, 1 / 6)
    expect(result.length).toBe(200)
  })

  it('preserves frequencies (only dB changes)', () => {
    const points = makePoints(100, -10)
    const result = smoothFrequencyResponse(points, 1 / 6)
    for (let i = 0; i < points.length; i++) {
      expect(result[i].freq).toBe(points[i].freq)
    }
  })

  it('flat response stays flat', () => {
    const points = makePoints(200, -20)
    const result = smoothFrequencyResponse(points, 1 / 6)
    for (const point of result) {
      expect(point.db).toBeCloseTo(-20, 6)
    }
  })

  it('reduces a sharp spike', () => {
    const points = makePointsWithPeak(200, 100, 20, -20)
    const raw = points[100].db
    const smoothed = smoothFrequencyResponse(points, 1 / 6)

    // The spike should be reduced
    expect(smoothed[100].db).toBeLessThan(raw)
    // But still be above the baseline
    expect(smoothed[100].db).toBeGreaterThan(-20)
  })

  it('preserves general peak location', () => {
    // Create a broad peak centred at ~1000 Hz
    const points: FrequencyPoint[] = []
    for (let i = 0; i < 200; i++) {
      const freq = 20 * Math.pow(15000 / 20, i / 199)
      const db = -20 + 30 * Math.exp(-Math.pow(Math.log10(freq / 1000), 2) * 20)
      points.push({ freq, db })
    }

    const smoothed = smoothFrequencyResponse(points, 1 / 6)

    // Find peak in original
    let origPeakIdx = 0
    for (let i = 1; i < points.length; i++) {
      if (points[i].db > points[origPeakIdx].db) origPeakIdx = i
    }

    // Find peak in smoothed
    let smoothPeakIdx = 0
    for (let i = 1; i < smoothed.length; i++) {
      if (smoothed[i].db > smoothed[smoothPeakIdx].db) smoothPeakIdx = i
    }

    // Peak location should be within a few indices
    expect(Math.abs(smoothPeakIdx - origPeakIdx)).toBeLessThanOrEqual(5)
  })

  it('contains no NaN values', () => {
    const points = makePoints(200, -10)
    const result = smoothFrequencyResponse(points, 1 / 6)
    for (const point of result) {
      expect(Number.isNaN(point.db)).toBe(false)
      expect(Number.isNaN(point.freq)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// smoothingOptionToFraction
// ---------------------------------------------------------------------------

describe('smoothingOptionToFraction', () => {
  it('returns 0 for "none"', () => {
    expect(smoothingOptionToFraction('none')).toBe(0)
  })

  it('returns 1/6 for "1/6"', () => {
    expect(smoothingOptionToFraction('1/6')).toBeCloseTo(1 / 6)
  })
})
