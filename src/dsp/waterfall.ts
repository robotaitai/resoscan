/**
 * Cumulative Spectral Decay (CSD) / Waterfall computation.
 *
 * Computes a 2D array of magnitude spectra at successive time offsets
 * from the impulse response, showing how each frequency decays over time.
 *
 * This is the standard "waterfall plot" used in room acoustics and
 * speaker measurement.
 */

import { fft, nextPowerOfTwo, realToComplex } from './fft'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaterfallSlice {
  /** Time offset from the start of the IR (seconds). */
  timeSec: number
  /** Magnitude spectrum in dB, sampled at logarithmic frequency points. */
  magnitudeDb: Float32Array
}

export interface WaterfallData {
  /** Array of spectral slices at increasing time offsets. */
  slices: WaterfallSlice[]
  /** Frequency values (Hz) corresponding to each index in magnitudeDb. */
  frequencies: Float32Array
  /** The global maximum dB value across all slices (for normalisation). */
  maxDb: number
}

export interface WaterfallOptions {
  /** Number of time slices (default: 30). */
  numSlices?: number
  /** Total time window in seconds (default: 0.3). */
  windowSec?: number
  /** Number of frequency points on the log axis (default: 200). */
  numFreqPoints?: number
  /** Minimum frequency (Hz, default: 20). */
  fMin?: number
  /** Maximum frequency (Hz, default: 15000). */
  fMax?: number
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Compute the cumulative spectral decay (waterfall) from an impulse response.
 */
export function computeWaterfall(
  ir: Float32Array,
  sampleRate: number,
  options: WaterfallOptions = {},
): WaterfallData {
  const {
    numSlices = 30,
    windowSec = 0.3,
    numFreqPoints = 200,
    fMin = 20,
    fMax = 15000,
  } = options

  const totalSamples = Math.min(Math.round(windowSec * sampleRate), ir.length)
  const fftSize = nextPowerOfTwo(totalSamples)

  // Pre-compute log-spaced frequency bins
  const logFMin = Math.log10(fMin)
  const logFMax = Math.log10(fMax)
  const frequencies = new Float32Array(numFreqPoints)
  const freqBins = new Float32Array(numFreqPoints) // corresponding FFT bin indices
  for (let i = 0; i < numFreqPoints; i++) {
    const t = i / (numFreqPoints - 1)
    const freq = Math.pow(10, logFMin + t * (logFMax - logFMin))
    frequencies[i] = freq
    freqBins[i] = (freq / sampleRate) * fftSize
  }

  const slices: WaterfallSlice[] = []
  let maxDb = -Infinity

  for (let s = 0; s < numSlices; s++) {
    // Time offset for this slice
    const startSample = Math.round((s / numSlices) * totalSamples)
    const timeSec = startSample / sampleRate

    // Extract windowed segment from startSample to end
    const remaining = ir.length - startSample
    if (remaining <= 0) break

    const segLen = Math.min(totalSamples - startSample, remaining)
    const segment = new Float32Array(segLen)

    // Apply half-Hann window (fade at the end only)
    for (let i = 0; i < segLen; i++) {
      const w =
        i < segLen - 1
          ? 0.5 * (1 - Math.cos((Math.PI * (segLen - 1 - i)) / (segLen - 1)))
          : 0
      segment[i] = ir[startSample + i] * (i < segLen / 2 ? 1 : w)
    }

    // FFT
    const { re, im } = realToComplex(segment, fftSize)
    fft(re, im)

    // Resample magnitude to log frequency axis
    const magnitudeDb = new Float32Array(numFreqPoints)
    for (let i = 0; i < numFreqPoints; i++) {
      const bin = freqBins[i]
      const binLow = Math.floor(bin)
      const binHigh = Math.min(binLow + 1, fftSize / 2 - 1)
      const frac = bin - binLow

      // Linearly interpolate magnitude
      const magLow = Math.sqrt(
        re[binLow] * re[binLow] + im[binLow] * im[binLow],
      )
      const magHigh = Math.sqrt(
        re[binHigh] * re[binHigh] + im[binHigh] * im[binHigh],
      )
      const mag = magLow + frac * (magHigh - magLow)

      const db = mag > 0 ? 20 * Math.log10(mag / fftSize) : -120
      magnitudeDb[i] = db
      if (db > maxDb) maxDb = db
    }

    slices.push({ timeSec, magnitudeDb })
  }

  return { slices, frequencies, maxDb }
}
