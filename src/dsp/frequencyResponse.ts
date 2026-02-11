/**
 * Frequency response computation from an impulse response.
 *
 * Pipeline:
 *   1. Optionally window the IR (e.g. 0–200 ms) with a half-Hann taper.
 *   2. FFT → magnitude spectrum.
 *   3. Convert to dB.
 *   4. Resample onto a logarithmic frequency axis for display.
 */

import { fft, nextPowerOfTwo, realToComplex } from './fft'
import { linearToDb } from './analyse'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single point on the frequency response curve. */
export interface FrequencyPoint {
  /** Frequency in Hz. */
  freq: number
  /** Magnitude in dB (relative). */
  db: number
}

// ---------------------------------------------------------------------------
// Windowing
// ---------------------------------------------------------------------------

/**
 * Window an IR to a given duration with a half-Hann fade-out at the end.
 * If `maxDurationSec` is undefined or larger than the IR, the full IR is used.
 *
 * @param ir  The impulse response.
 * @param sampleRate  Sample rate in Hz.
 * @param maxDurationSec  Window duration in seconds.
 * @param fadeOutRatio  Fraction of the window used for the Hann fade-out (default 0.1 = 10%).
 */
export function windowIR(
  ir: Float32Array,
  sampleRate: number,
  maxDurationSec?: number,
  fadeOutRatio: number = 0.1,
): Float32Array {
  const maxSamples =
    maxDurationSec != null
      ? Math.min(Math.round(maxDurationSec * sampleRate), ir.length)
      : ir.length

  const windowed = new Float32Array(maxSamples)
  for (let i = 0; i < maxSamples; i++) {
    windowed[i] = ir[i]
  }

  // Apply half-Hann fade-out to the last fadeOutRatio of the window
  const fadeLen = Math.round(maxSamples * fadeOutRatio)
  if (fadeLen > 0) {
    const fadeStart = maxSamples - fadeLen
    for (let i = fadeStart; i < maxSamples; i++) {
      const t = (i - fadeStart) / fadeLen // 0 → 1
      const w = 0.5 * (1 + Math.cos(Math.PI * t)) // 1 → 0
      windowed[i] *= w
    }
  }

  return windowed
}

// ---------------------------------------------------------------------------
// Magnitude response
// ---------------------------------------------------------------------------

/**
 * Compute the magnitude response (in dB) of a time-domain signal,
 * resampled onto a logarithmic frequency axis between `fMin` and `fMax`.
 *
 * @param signal  Time-domain signal (typically a windowed IR).
 * @param sampleRate  Sample rate in Hz.
 * @param fMin  Lower frequency bound (Hz).
 * @param fMax  Upper frequency bound (Hz).
 * @param numPoints  Number of output points on the log frequency axis.
 * @returns Array of { freq, db } points.
 */
export function computeMagnitudeResponse(
  signal: Float32Array,
  sampleRate: number,
  fMin: number,
  fMax: number,
  numPoints: number,
): FrequencyPoint[] {
  if (signal.length === 0 || numPoints <= 0) return []

  // FFT
  const N = nextPowerOfTwo(signal.length)
  const { re, im } = realToComplex(signal, N)
  fft(re, im)

  // Build magnitude array (only positive frequencies: bins 0..N/2)
  const halfN = N / 2
  const magnitudes = new Float64Array(halfN + 1)
  for (let k = 0; k <= halfN; k++) {
    magnitudes[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k])
  }

  // Resample onto log-spaced frequencies
  const logFMin = Math.log10(Math.max(fMin, 1))
  const logFMax = Math.log10(Math.min(fMax, sampleRate / 2))
  const binWidth = sampleRate / N

  const points: FrequencyPoint[] = []

  for (let i = 0; i < numPoints; i++) {
    const logF = logFMin + ((logFMax - logFMin) * i) / (numPoints - 1)
    const freq = Math.pow(10, logF)

    // Interpolate between the two nearest FFT bins
    const exactBin = freq / binWidth
    const binLow = Math.floor(exactBin)
    const binHigh = Math.ceil(exactBin)
    const frac = exactBin - binLow

    let mag: number
    if (binHigh >= magnitudes.length) {
      mag = magnitudes[magnitudes.length - 1]
    } else if (binLow === binHigh || binLow < 0) {
      mag = magnitudes[Math.max(0, Math.min(binHigh, magnitudes.length - 1))]
    } else {
      mag = magnitudes[binLow] * (1 - frac) + magnitudes[binHigh] * frac
    }

    const db = linearToDb(mag)

    points.push({
      freq,
      db: Number.isFinite(db) ? db : -120, // clamp -Infinity for display
    })
  }

  return points
}
