import { detectPeaks, DEFAULT_BANDS } from './peakDetection'
import type { FrequencyPoint } from './frequencyResponse'
import type { FrequencyBand, DetectedPeak } from './peakDetection'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a synthetic frequency response with known peaks.
 * Base level is `baseDb`. Each peak is a Gaussian bump in log-frequency space.
 */
function makeSyntheticResponse(
  peaks: { freq: number; amplitude: number; width: number }[],
  baseDb: number = -30,
  numPoints: number = 500,
  fMin: number = 20,
  fMax: number = 15000,
): FrequencyPoint[] {
  const points: FrequencyPoint[] = []
  const logMin = Math.log10(fMin)
  const logMax = Math.log10(fMax)

  for (let i = 0; i < numPoints; i++) {
    const logF = logMin + ((logMax - logMin) * i) / (numPoints - 1)
    const freq = Math.pow(10, logF)

    let db = baseDb
    for (const peak of peaks) {
      const logPeak = Math.log10(peak.freq)
      const dist = logF - logPeak
      db +=
        peak.amplitude *
        Math.exp(-(dist * dist) / (2 * peak.width * peak.width))
    }

    points.push({ freq, db })
  }

  return points
}

/** Find a detected peak closest to a target frequency. */
function findPeakNearFreq(
  detected: DetectedPeak[],
  targetFreq: number,
  toleranceRatio: number = 0.15,
): DetectedPeak | undefined {
  return detected.find(
    (p) => Math.abs(p.freq - targetFreq) / targetFreq < toleranceRatio,
  )
}

// ---------------------------------------------------------------------------
// detectPeaks
// ---------------------------------------------------------------------------

describe('detectPeaks', () => {
  it('returns empty for fewer than 3 points', () => {
    expect(detectPeaks([])).toEqual([])
    expect(detectPeaks([{ freq: 100, db: 0 }])).toEqual([])
    expect(
      detectPeaks([
        { freq: 100, db: 0 },
        { freq: 200, db: 5 },
      ]),
    ).toEqual([])
  })

  it('returns empty for flat response', () => {
    const flat = makeSyntheticResponse([], -20, 200)
    const peaks = detectPeaks(flat)
    expect(peaks.length).toBe(0)
  })

  it('detects a single prominent peak', () => {
    const points = makeSyntheticResponse(
      [{ freq: 1000, amplitude: 15, width: 0.05 }],
      -30,
    )
    const peaks = detectPeaks(points)
    expect(peaks.length).toBeGreaterThanOrEqual(1)

    const found = findPeakNearFreq(peaks, 1000)
    expect(found).toBeDefined()
    expect(found!.prominence).toBeGreaterThan(3)
  })

  it('detects multiple peaks at known frequencies', () => {
    const injected = [
      { freq: 55, amplitude: 20, width: 0.04 },
      { freq: 110, amplitude: 15, width: 0.04 },
      { freq: 500, amplitude: 12, width: 0.04 },
      { freq: 2000, amplitude: 10, width: 0.04 },
    ]
    const points = makeSyntheticResponse(injected, -30)
    const peaks = detectPeaks(points, { minProminence: 3, maxPeaks: 10 })

    // All 4 injected peaks should be detected
    for (const inj of injected) {
      const found = findPeakNearFreq(peaks, inj.freq)
      expect(found).toBeDefined()
    }
  })

  it('sorts peaks by prominence descending', () => {
    const points = makeSyntheticResponse(
      [
        { freq: 100, amplitude: 10, width: 0.04 },
        { freq: 1000, amplitude: 20, width: 0.04 },
        { freq: 5000, amplitude: 5, width: 0.04 },
      ],
      -30,
    )
    const peaks = detectPeaks(points)
    for (let i = 1; i < peaks.length; i++) {
      expect(peaks[i].prominence).toBeLessThanOrEqual(peaks[i - 1].prominence)
    }
  })

  it('respects minProminence threshold', () => {
    const points = makeSyntheticResponse(
      [
        { freq: 100, amplitude: 2, width: 0.04 }, // below threshold
        { freq: 1000, amplitude: 20, width: 0.04 }, // above threshold
      ],
      -30,
    )
    const peaks = detectPeaks(points, { minProminence: 5 })
    // The 2 dB peak should be filtered out
    expect(findPeakNearFreq(peaks, 100)).toBeUndefined()
    expect(findPeakNearFreq(peaks, 1000)).toBeDefined()
  })

  it('respects maxPeaks limit', () => {
    const injected = Array.from({ length: 20 }, (_, i) => ({
      freq: 30 + i * 700,
      amplitude: 10 + i,
      width: 0.03,
    }))
    const points = makeSyntheticResponse(injected, -40)
    const peaks = detectPeaks(points, { maxPeaks: 5 })
    expect(peaks.length).toBeLessThanOrEqual(5)
  })

  it('classifies peaks into default bands', () => {
    const points = makeSyntheticResponse(
      [
        { freq: 80, amplitude: 15, width: 0.04 }, // Room modes (20-300)
        { freq: 1000, amplitude: 15, width: 0.04 }, // Mid / High (300-15k)
      ],
      -30,
    )
    const peaks = detectPeaks(points)

    const roomPeak = findPeakNearFreq(peaks, 80)
    expect(roomPeak).toBeDefined()
    expect(roomPeak!.band).toBe('Room modes')

    const midPeak = findPeakNearFreq(peaks, 1000)
    expect(midPeak).toBeDefined()
    expect(midPeak!.band).toBe('Mid / High')
  })

  it('uses custom bands', () => {
    const customBands: FrequencyBand[] = [
      { label: 'Bass', minHz: 20, maxHz: 200 },
      { label: 'Treble', minHz: 5000, maxHz: 15000 },
    ]
    const points = makeSyntheticResponse(
      [
        { freq: 100, amplitude: 15, width: 0.04 },
        { freq: 8000, amplitude: 15, width: 0.04 },
        { freq: 1000, amplitude: 15, width: 0.04 }, // outside custom bands
      ],
      -30,
    )
    const peaks = detectPeaks(points, { bands: customBands })

    const bassPeak = findPeakNearFreq(peaks, 100)
    expect(bassPeak?.band).toBe('Bass')

    const treblePeak = findPeakNearFreq(peaks, 8000)
    expect(treblePeak?.band).toBe('Treble')

    const midPeak = findPeakNearFreq(peaks, 1000)
    if (midPeak) expect(midPeak.band).toBeNull()
  })

  it('peak has correct index into input array', () => {
    const points = makeSyntheticResponse(
      [{ freq: 500, amplitude: 15, width: 0.05 }],
      -30,
    )
    const peaks = detectPeaks(points)
    expect(peaks.length).toBeGreaterThanOrEqual(1)
    const peak = peaks[0]

    // The point at the stored index should match the peak
    expect(points[peak.index].freq).toBeCloseTo(peak.freq, 2)
    expect(points[peak.index].db).toBeCloseTo(peak.db, 2)
  })

  it('contains no NaN values in results', () => {
    const points = makeSyntheticResponse(
      [
        { freq: 100, amplitude: 15, width: 0.04 },
        { freq: 1000, amplitude: 10, width: 0.04 },
      ],
      -30,
    )
    const peaks = detectPeaks(points)
    for (const p of peaks) {
      expect(Number.isNaN(p.freq)).toBe(false)
      expect(Number.isNaN(p.db)).toBe(false)
      expect(Number.isNaN(p.prominence)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// DEFAULT_BANDS
// ---------------------------------------------------------------------------

describe('DEFAULT_BANDS', () => {
  it('covers the expected range', () => {
    expect(DEFAULT_BANDS.length).toBe(2)
    expect(DEFAULT_BANDS[0].minHz).toBe(20)
    expect(DEFAULT_BANDS[0].maxHz).toBe(300)
    expect(DEFAULT_BANDS[1].minHz).toBe(300)
    expect(DEFAULT_BANDS[1].maxHz).toBe(15000)
  })
})
