/**
 * Fractional-octave smoothing for frequency response data.
 *
 * Applies a moving-average filter in the logarithmic frequency domain.
 * Each output point is the average of all input points whose frequencies
 * fall within ±(fraction/2) octaves of the centre frequency.
 *
 * This is the standard approach used in acoustic measurement tools
 * (e.g. REW, ARTA).
 */

import type { FrequencyPoint } from './frequencyResponse'

/** Available smoothing presets. */
export type SmoothingOption = 'none' | '1/6'

/**
 * Apply fractional-octave smoothing to a frequency response.
 *
 * @param points  Input frequency response (must be sorted by freq ascending).
 * @param fractionOfOctave  Smoothing width in octaves (e.g. 1/6 for 1/6-octave).
 *                          Pass 0 or undefined for no smoothing.
 * @returns New array of FrequencyPoint with smoothed dB values.
 */
export function smoothFrequencyResponse(
  points: FrequencyPoint[],
  fractionOfOctave?: number,
): FrequencyPoint[] {
  if (!fractionOfOctave || fractionOfOctave <= 0 || points.length === 0) {
    return points
  }

  const halfOctave = fractionOfOctave / 2
  const result: FrequencyPoint[] = new Array(points.length)

  // Pre-compute log2 frequencies for fast range lookup
  const log2Freqs = new Float64Array(points.length)
  for (let i = 0; i < points.length; i++) {
    log2Freqs[i] = Math.log2(points[i].freq)
  }

  for (let i = 0; i < points.length; i++) {
    const centerLog2 = log2Freqs[i]
    const loLog2 = centerLog2 - halfOctave
    const hiLog2 = centerLog2 + halfOctave

    // Find the window bounds using the pre-computed log2 array.
    // Since points are sorted by frequency, we can use a simple scan
    // outward from the centre index.
    let lo = i
    while (lo > 0 && log2Freqs[lo - 1] >= loLog2) lo--

    let hi = i
    while (hi < points.length - 1 && log2Freqs[hi + 1] <= hiLog2) hi++

    // Average dB values in the window
    let sum = 0
    const count = hi - lo + 1
    for (let j = lo; j <= hi; j++) {
      sum += points[j].db
    }

    result[i] = {
      freq: points[i].freq,
      db: sum / count,
    }
  }

  return result
}

/**
 * Convert a SmoothingOption to the fractional-octave number.
 */
export function smoothingOptionToFraction(option: SmoothingOption): number {
  switch (option) {
    case 'none':
      return 0
    case '1/6':
      return 1 / 6
  }
}
