import {
  parseCalibrationFile,
  interpolateCalibration,
  applyCalibration,
} from './calibration'
import type { CalibrationPoint, CalibrationData } from './calibration'
import type { FrequencyPoint } from './frequencyResponse'

// ---------------------------------------------------------------------------
// parseCalibrationFile
// ---------------------------------------------------------------------------

describe('parseCalibrationFile', () => {
  it('parses a simple 3-point file', () => {
    const text = `
# Mic calibration
100 -2.5
1000 0.0
10000 3.1
`
    const result = parseCalibrationFile(text, 'test.txt')
    expect(result.filename).toBe('test.txt')
    expect(result.points).toHaveLength(3)
    expect(result.points[0]).toEqual({ freq: 100, db: -2.5 })
    expect(result.points[1]).toEqual({ freq: 1000, db: 0 })
    expect(result.points[2]).toEqual({ freq: 10000, db: 3.1 })
  })

  it('handles comma-separated values', () => {
    const text = '100, -1.0\n1000, 0.5'
    const result = parseCalibrationFile(text, 'csv.txt')
    expect(result.points).toHaveLength(2)
    expect(result.points[0].db).toBe(-1.0)
    expect(result.points[1].db).toBe(0.5)
  })

  it('handles tab-separated values', () => {
    const text = '100\t-1.0\n1000\t0.5'
    const result = parseCalibrationFile(text, 'tsv.txt')
    expect(result.points).toHaveLength(2)
  })

  it('skips comment lines starting with # or *', () => {
    const text = `
# This is a comment
* This is also a comment
100 0
1000 1
`
    const result = parseCalibrationFile(text, 'comments.txt')
    expect(result.points).toHaveLength(2)
  })

  it('skips blank lines', () => {
    const text = '\n\n100 0\n\n1000 1\n\n'
    const result = parseCalibrationFile(text, 'blanks.txt')
    expect(result.points).toHaveLength(2)
  })

  it('sorts points by frequency ascending', () => {
    const text = '10000 3\n100 -2\n1000 0'
    const result = parseCalibrationFile(text, 'unsorted.txt')
    expect(result.points[0].freq).toBe(100)
    expect(result.points[1].freq).toBe(1000)
    expect(result.points[2].freq).toBe(10000)
  })

  it('handles Windows-style CRLF line endings', () => {
    const text = '100 -1\r\n1000 0\r\n'
    const result = parseCalibrationFile(text, 'windows.txt')
    expect(result.points).toHaveLength(2)
  })

  it('throws on fewer than 2 data points', () => {
    expect(() => parseCalibrationFile('100 0', 'one.txt')).toThrow(
      'at least 2 data points',
    )
  })

  it('throws on empty file', () => {
    expect(() => parseCalibrationFile('', 'empty.txt')).toThrow(
      'at least 2 data points',
    )
  })

  it('throws on invalid frequency', () => {
    expect(() => parseCalibrationFile('abc 0\n1000 1', 'bad.txt')).toThrow(
      'invalid frequency',
    )
  })

  it('throws on zero frequency', () => {
    expect(() => parseCalibrationFile('0 0\n1000 1', 'zero.txt')).toThrow(
      'invalid frequency',
    )
  })

  it('throws on negative frequency', () => {
    expect(() => parseCalibrationFile('-100 0\n1000 1', 'neg.txt')).toThrow(
      'invalid frequency',
    )
  })

  it('throws on invalid dB value', () => {
    expect(() => parseCalibrationFile('100 abc\n1000 1', 'baddb.txt')).toThrow(
      'invalid dB value',
    )
  })

  it('throws on lines with too few columns', () => {
    expect(() => parseCalibrationFile('100\n1000 1', 'few.txt')).toThrow(
      'expected "freq dB"',
    )
  })
})

// ---------------------------------------------------------------------------
// interpolateCalibration
// ---------------------------------------------------------------------------

describe('interpolateCalibration', () => {
  const threePoints: CalibrationPoint[] = [
    { freq: 100, db: -2 },
    { freq: 1000, db: 0 },
    { freq: 10000, db: 3 },
  ]

  it('returns exact values at calibration frequencies', () => {
    const result = interpolateCalibration(threePoints, [100, 1000, 10000])
    expect(result[0]).toBeCloseTo(-2, 5)
    expect(result[1]).toBeCloseTo(0, 5)
    expect(result[2]).toBeCloseTo(3, 5)
  })

  it('interpolates linearly in log-frequency space', () => {
    // Midpoint between log10(100)=2 and log10(1000)=3 is log10(316.2...)
    // Expected dB: midpoint between -2 and 0 = -1
    const midFreq = Math.pow(10, 2.5) // ≈ 316.23
    const result = interpolateCalibration(threePoints, [midFreq])
    expect(result[0]).toBeCloseTo(-1, 2)
  })

  it('flat-extrapolates below the lowest calibration frequency', () => {
    const result = interpolateCalibration(threePoints, [10, 20, 50])
    expect(result[0]).toBeCloseTo(-2, 5) // same as 100 Hz value
    expect(result[1]).toBeCloseTo(-2, 5)
    expect(result[2]).toBeCloseTo(-2, 5)
  })

  it('flat-extrapolates above the highest calibration frequency', () => {
    const result = interpolateCalibration(threePoints, [15000, 20000])
    expect(result[0]).toBeCloseTo(3, 5)
    expect(result[1]).toBeCloseTo(3, 5)
  })

  it('returns zeros for empty calibration', () => {
    const result = interpolateCalibration([], [100, 1000])
    expect(result).toEqual([0, 0])
  })

  it('returns correct length for many target frequencies', () => {
    const targets = Array.from({ length: 500 }, (_, i) => 20 + i * 30)
    const result = interpolateCalibration(threePoints, targets)
    expect(result).toHaveLength(500)
    result.forEach((v) => expect(Number.isFinite(v)).toBe(true))
  })

  it('handles single-point calibration gracefully', () => {
    // interpolateCalibration requires sorted array, edge case
    const single: CalibrationPoint[] = [{ freq: 1000, db: 2 }]
    const result = interpolateCalibration(single, [100, 1000, 10000])
    // Everything should extrapolate to 2
    expect(result).toEqual([2, 2, 2])
  })

  it('produces monotonic interpolation for monotonic input', () => {
    // Correction rises from -2 to 0 to +3
    const targets = [100, 200, 500, 1000, 2000, 5000, 10000]
    const result = interpolateCalibration(threePoints, targets)
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1] - 0.0001)
    }
  })
})

// ---------------------------------------------------------------------------
// applyCalibration
// ---------------------------------------------------------------------------

describe('applyCalibration', () => {
  const calibration: CalibrationData = {
    filename: 'test.txt',
    points: [
      { freq: 100, db: -5 },
      { freq: 1000, db: 0 },
      { freq: 10000, db: 2 },
    ],
  }

  it('adds correction to dB values', () => {
    const points: FrequencyPoint[] = [
      { freq: 100, db: -10 },
      { freq: 1000, db: -5 },
      { freq: 10000, db: 0 },
    ]
    const result = applyCalibration(points, calibration)
    expect(result[0].db).toBeCloseTo(-15, 2) // -10 + (-5) = -15
    expect(result[1].db).toBeCloseTo(-5, 2) // -5 + 0 = -5
    expect(result[2].db).toBeCloseTo(2, 2) // 0 + 2 = 2
  })

  it('preserves frequencies', () => {
    const points: FrequencyPoint[] = [
      { freq: 100, db: 0 },
      { freq: 1000, db: 0 },
    ]
    const result = applyCalibration(points, calibration)
    expect(result[0].freq).toBe(100)
    expect(result[1].freq).toBe(1000)
  })

  it('returns original points for empty calibration', () => {
    const points: FrequencyPoint[] = [{ freq: 100, db: -10 }]
    const empty: CalibrationData = { filename: 'e.txt', points: [] }
    const result = applyCalibration(points, empty)
    expect(result).toEqual(points)
  })

  it('returns empty for empty input', () => {
    const result = applyCalibration([], calibration)
    expect(result).toEqual([])
  })

  it('does not mutate original points', () => {
    const points: FrequencyPoint[] = [{ freq: 100, db: -10 }]
    const original = { ...points[0] }
    applyCalibration(points, calibration)
    expect(points[0]).toEqual(original)
  })
})
