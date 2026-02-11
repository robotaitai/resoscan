/**
 * Microphone calibration support.
 *
 * Parses a calibration .txt file (frequency/dB correction pairs),
 * interpolates to arbitrary target frequencies, and applies the
 * correction to a frequency response.
 *
 * Supported file format (one entry per line, whitespace-separated):
 *   <frequency_Hz>  <correction_dB>
 *
 * Lines starting with '#' or '*' and blank lines are ignored (comments).
 */

import type { FrequencyPoint } from './frequencyResponse'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single calibration data point. */
export interface CalibrationPoint {
  /** Frequency in Hz. */
  freq: number
  /** Correction in dB (added to the measured magnitude). */
  db: number
}

/** Parsed calibration data ready for use. */
export interface CalibrationData {
  /** Source filename for display purposes. */
  filename: string
  /** Sorted calibration points (ascending frequency). */
  points: CalibrationPoint[]
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a calibration .txt file.
 *
 * @param text  Raw file contents.
 * @param filename  Original filename (stored for display).
 * @returns CalibrationData, or throws on invalid input.
 */
export function parseCalibrationFile(
  text: string,
  filename: string,
): CalibrationData {
  const lines = text.split(/\r?\n/)
  const points: CalibrationPoint[] = []

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim()

    // Skip empty lines and comments
    if (line === '' || line.startsWith('#') || line.startsWith('*')) continue

    // Split on whitespace or comma
    const parts = line.split(/[\s,]+/)
    if (parts.length < 2) {
      throw new Error(
        `Calibration file line ${lineNum + 1}: expected "freq dB", got "${line}"`,
      )
    }

    const freq = Number(parts[0])
    const db = Number(parts[1])

    if (!Number.isFinite(freq) || freq <= 0) {
      throw new Error(
        `Calibration file line ${lineNum + 1}: invalid frequency "${parts[0]}"`,
      )
    }
    if (!Number.isFinite(db)) {
      throw new Error(
        `Calibration file line ${lineNum + 1}: invalid dB value "${parts[1]}"`,
      )
    }

    points.push({ freq, db })
  }

  if (points.length < 2) {
    throw new Error('Calibration file must contain at least 2 data points')
  }

  // Sort by frequency ascending
  points.sort((a, b) => a.freq - b.freq)

  return { filename, points }
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

/**
 * Interpolate calibration corrections for an array of target frequencies.
 *
 * Uses linear interpolation in log-frequency space for smooth curves.
 * Frequencies below the lowest calibration point use the first correction;
 * frequencies above the highest use the last correction (flat extrapolation).
 *
 * @param calibration  Parsed calibration data (sorted ascending).
 * @param targetFreqs  Array of frequencies to interpolate at (Hz).
 * @returns Array of dB corrections, same length as targetFreqs.
 */
export function interpolateCalibration(
  calibration: CalibrationPoint[],
  targetFreqs: number[],
): number[] {
  if (calibration.length === 0) return targetFreqs.map(() => 0)

  // Pre-compute log frequencies for the calibration points
  const calLogFreqs = calibration.map((p) => Math.log10(p.freq))
  const calDbs = calibration.map((p) => p.db)

  return targetFreqs.map((freq) => {
    const logFreq = Math.log10(freq)

    // Below range → flat extrapolation
    if (logFreq <= calLogFreqs[0]) return calDbs[0]

    // Above range → flat extrapolation
    if (logFreq >= calLogFreqs[calLogFreqs.length - 1]) {
      return calDbs[calDbs.length - 1]
    }

    // Binary search for the surrounding calibration points
    let lo = 0
    let hi = calLogFreqs.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (calLogFreqs[mid] <= logFreq) lo = mid
      else hi = mid
    }

    // Linear interpolation in log-frequency space
    const t = (logFreq - calLogFreqs[lo]) / (calLogFreqs[hi] - calLogFreqs[lo])
    return calDbs[lo] + t * (calDbs[hi] - calDbs[lo])
  })
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

/**
 * Apply a calibration correction to a frequency response.
 *
 * @param points  Input frequency response.
 * @param calibration  Parsed calibration data.
 * @returns New array of FrequencyPoint with corrected dB values.
 */
export function applyCalibration(
  points: FrequencyPoint[],
  calibration: CalibrationData,
): FrequencyPoint[] {
  if (points.length === 0 || calibration.points.length === 0) return points

  const corrections = interpolateCalibration(
    calibration.points,
    points.map((p) => p.freq),
  )

  return points.map((p, i) => ({
    freq: p.freq,
    db: p.db + corrections[i],
  }))
}
