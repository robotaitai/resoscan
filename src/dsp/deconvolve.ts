/**
 * Deconvolution and impulse response extraction.
 *
 * Given a recording and the inverse filter for the sweep that produced it,
 * compute the room impulse response via FFT-based convolution, then
 * auto-align so the main peak sits at sample 0.
 */

import { convolve } from './convolve'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of impulse response extraction. */
export interface ImpulseResponseResult {
  /**
   * The extracted impulse response, normalised so that the peak = 1.0,
   * with the main peak shifted to the beginning.
   */
  ir: Float32Array
  /** Index of the main peak in the *original* (pre-shift) convolution output. */
  peakIndex: number
  /** Peak absolute value before normalisation. */
  rawPeak: number
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract the impulse response from a measurement recording.
 *
 * Steps:
 *   1. Convolve the recording with the inverse sweep filter.
 *   2. Find the main impulse peak.
 *   3. Shift so peak is at sample 0 (auto-align).
 *   4. Normalise so peak absolute value = 1.
 *
 * @param recording  The recorded signal (mono Float32Array).
 * @param inverseFilter  The inverse filter matching the sweep used.
 * @param maxLengthSamples  Optional: trim the IR to this many samples after the peak.
 *                          Useful to discard the long tail for display.
 */
export function extractImpulseResponse(
  recording: Float32Array | Float64Array,
  inverseFilter: Float32Array | Float64Array,
  maxLengthSamples?: number,
): ImpulseResponseResult {
  // 1. Convolve
  const raw = convolve(recording, inverseFilter)

  // 2. Find main peak
  const peakIndex = findPeakIndex(raw)
  const rawPeak = Math.abs(raw[peakIndex])

  // 3. Auto-align: shift so peak is at index 0
  const afterPeak = raw.length - peakIndex
  const irLength =
    maxLengthSamples != null ? Math.min(maxLengthSamples, afterPeak) : afterPeak
  const ir = new Float32Array(irLength)
  for (let i = 0; i < irLength; i++) {
    ir[i] = raw[peakIndex + i]
  }

  // 4. Normalise
  if (rawPeak > 0) {
    const scale = 1 / rawPeak
    for (let i = 0; i < ir.length; i++) {
      ir[i] *= scale
    }
  }

  return { ir, peakIndex, rawPeak }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the index of the sample with the largest absolute value.
 * Returns 0 for empty buffers.
 */
export function findPeakIndex(buffer: Float32Array | Float64Array): number {
  if (buffer.length === 0) return 0
  let maxAbs = 0
  let idx = 0
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i])
    if (abs > maxAbs) {
      maxAbs = abs
      idx = i
    }
  }
  return idx
}
