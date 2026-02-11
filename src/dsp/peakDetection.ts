/**
 * Peak detection on a frequency response curve.
 *
 * Finds local maxima that exceed a configurable prominence threshold,
 * classifies them into frequency bands, and returns the top N peaks
 * sorted by prominence.
 */

import type { FrequencyPoint } from './frequencyResponse'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A frequency band for classification. */
export interface FrequencyBand {
  /** Human-readable name. */
  label: string
  /** Lower bound in Hz (inclusive). */
  minHz: number
  /** Upper bound in Hz (exclusive). */
  maxHz: number
}

/** A detected resonance peak. */
export interface DetectedPeak {
  /** Frequency of the peak in Hz. */
  freq: number
  /** Magnitude in dB at the peak. */
  db: number
  /** Prominence: how much the peak stands above its neighbours (dB). */
  prominence: number
  /** Index in the input FrequencyPoint array. */
  index: number
  /** Band this peak belongs to, or null if outside all bands. */
  band: string | null
}

/** Options for peak detection. */
export interface PeakDetectionOptions {
  /** Minimum prominence in dB for a peak to be reported. Default: 3. */
  minProminence?: number
  /** Maximum number of peaks to return. Default: 10. */
  maxPeaks?: number
  /** Frequency bands for classification. */
  bands?: FrequencyBand[]
}

// ---------------------------------------------------------------------------
// Default bands
// ---------------------------------------------------------------------------

export const DEFAULT_BANDS: FrequencyBand[] = [
  { label: 'Room modes', minHz: 20, maxHz: 300 },
  { label: 'Mid / High', minHz: 300, maxHz: 15_000 },
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect resonance peaks in a frequency response.
 *
 * Algorithm:
 *   1. Find all local maxima (points higher than both neighbours).
 *   2. Compute prominence for each maximum.
 *   3. Filter by minimum prominence.
 *   4. Classify into frequency bands.
 *   5. Sort by prominence descending, return top N.
 *
 * @param points  Frequency response (sorted by freq ascending).
 * @param options  Detection parameters.
 * @returns Array of DetectedPeak, sorted by prominence descending.
 */
export function detectPeaks(
  points: FrequencyPoint[],
  options: PeakDetectionOptions = {},
): DetectedPeak[] {
  const { minProminence = 3, maxPeaks = 10, bands = DEFAULT_BANDS } = options

  if (points.length < 3) return []

  // 1. Find local maxima
  const candidates: { index: number; freq: number; db: number }[] = []
  for (let i = 1; i < points.length - 1; i++) {
    if (points[i].db > points[i - 1].db && points[i].db > points[i + 1].db) {
      candidates.push({ index: i, freq: points[i].freq, db: points[i].db })
    }
  }

  // 2. Compute prominence for each candidate
  const peaks: DetectedPeak[] = []

  for (const c of candidates) {
    const prom = computeProminence(points, c.index)
    if (prom < minProminence) continue

    // 3. Classify into band
    const band = classifyBand(c.freq, bands)

    peaks.push({
      freq: c.freq,
      db: c.db,
      prominence: prom,
      index: c.index,
      band,
    })
  }

  // 4. Sort by prominence descending
  peaks.sort((a, b) => b.prominence - a.prominence)

  // 5. Return top N
  return peaks.slice(0, maxPeaks)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the prominence of a peak at the given index.
 *
 * Prominence = peak dB − max(left valley, right valley),
 * where the valley is the lowest dB between this peak and the next
 * higher peak on each side.
 */
function computeProminence(points: FrequencyPoint[], peakIdx: number): number {
  const peakDb = points[peakIdx].db

  // Scan left for the lowest point before a higher peak or the edge
  let leftValley = peakDb
  for (let i = peakIdx - 1; i >= 0; i--) {
    if (points[i].db < leftValley) leftValley = points[i].db
    if (points[i].db > peakDb) break
  }

  // Scan right
  let rightValley = peakDb
  for (let i = peakIdx + 1; i < points.length; i++) {
    if (points[i].db < rightValley) rightValley = points[i].db
    if (points[i].db > peakDb) break
  }

  // Prominence = peak height above the higher of the two valleys
  const referenceLevel = Math.max(leftValley, rightValley)
  return peakDb - referenceLevel
}

/**
 * Classify a frequency into one of the given bands.
 * Returns the band label, or null if outside all bands.
 */
function classifyBand(freq: number, bands: FrequencyBand[]): string | null {
  for (const band of bands) {
    if (freq >= band.minHz && freq < band.maxHz) {
      return band.label
    }
  }
  return null
}
