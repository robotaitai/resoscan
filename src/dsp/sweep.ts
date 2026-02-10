/**
 * Logarithmic (exponential) sine sweep generator following the Farina (2000)
 * method. Used for room impulse response measurement.
 *
 * Reference: A. Farina, "Simultaneous measurement of impulse response and
 * distortion with a swept-sine technique," AES 108th Convention, 2000.
 */

/** Parameters for sweep generation. */
export interface SweepParams {
  /** Start frequency in Hz (e.g. 20). */
  fStart: number
  /** End frequency in Hz (e.g. 15000). */
  fEnd: number
  /** Duration of the sweep in seconds. */
  durationSec: number
  /** Sample rate in Hz (e.g. 48000). */
  sampleRate: number
  /** Fade-in duration in seconds (default: 0.01). */
  fadeInSec?: number
  /** Fade-out duration in seconds (default: 0.01). */
  fadeOutSec?: number
}

/**
 * Generate a logarithmic sine sweep.
 *
 * The instantaneous frequency increases exponentially from fStart to fEnd:
 *
 *   f(t) = fStart * (fEnd/fStart)^(t/T)
 *
 * The phase integral gives:
 *
 *   φ(t) = 2π * fStart * T / ln(fEnd/fStart) * [(fEnd/fStart)^(t/T) - 1]
 *
 * A cosine-squared fade is applied at both ends to avoid clicks.
 */
export function generateLogSweep(params: SweepParams): Float32Array {
  const {
    fStart,
    fEnd,
    durationSec,
    sampleRate,
    fadeInSec = 0.01,
    fadeOutSec = 0.01,
  } = params

  validateSweepParams(params)

  const numSamples = Math.round(durationSec * sampleRate)
  const output = new Float32Array(numSamples)

  const lnRatio = Math.log(fEnd / fStart)
  const T = durationSec

  // Phase constant: 2π * fStart * T / ln(fEnd/fStart)
  const phaseK = (2 * Math.PI * fStart * T) / lnRatio

  const fadeInSamples = Math.min(Math.round(fadeInSec * sampleRate), numSamples)
  const fadeOutSamples = Math.min(
    Math.round(fadeOutSec * sampleRate),
    numSamples,
  )

  for (let n = 0; n < numSamples; n++) {
    const t = n / sampleRate
    const tNorm = t / T // 0 → 1

    // Instantaneous phase: φ(t) = K * [exp(tNorm * lnRatio) - 1]
    const phase = phaseK * (Math.exp(tNorm * lnRatio) - 1)
    let sample = Math.sin(phase)

    // Apply fade-in (raised cosine)
    if (n < fadeInSamples) {
      const w = 0.5 * (1 - Math.cos((Math.PI * n) / fadeInSamples))
      sample *= w
    }

    // Apply fade-out (raised cosine)
    if (n >= numSamples - fadeOutSamples) {
      const remaining = numSamples - 1 - n
      const w = 0.5 * (1 - Math.cos((Math.PI * remaining) / fadeOutSamples))
      sample *= w
    }

    output[n] = sample
  }

  return output
}

/**
 * Generate the inverse filter for the log sweep.
 *
 * For a logarithmic sweep, the inverse filter is the time-reversed sweep
 * with an exponentially decaying amplitude envelope that compensates for
 * the fact that lower frequencies occupy more time (and thus more energy)
 * in the sweep.
 *
 * The amplitude envelope decays as:
 *   a(t) = (fStart/fEnd)^(t/T)
 *
 * which is equivalent to applying a -6 dB/octave tilt when the sweep
 * is time-reversed.
 *
 * The result is normalised so that convolving sweep * inverse ≈ delta.
 */
export function generateInverseFilter(params: SweepParams): Float32Array {
  const { fStart, fEnd, durationSec, sampleRate } = params

  validateSweepParams(params)

  // Generate the raw sweep (no fade — the inverse filter shouldn't have fades)
  const sweep = generateLogSweep({
    ...params,
    fadeInSec: 0,
    fadeOutSec: 0,
  })

  const numSamples = sweep.length
  const inverse = new Float32Array(numSamples)
  const T = durationSec
  const lnRatio = Math.log(fEnd / fStart)

  // Time-reverse with amplitude compensation
  for (let n = 0; n < numSamples; n++) {
    const t = n / sampleRate
    // Amplitude: exponential decay compensating the sweep rate
    // At t=0 the sweep is slow (low freq, more energy) → needs more attenuation
    // At t=T the sweep is fast (high freq, less energy) → needs less attenuation
    const amplitude = Math.exp((-t * lnRatio) / T)

    // Time-reverse: sample at index n in sweep → index (numSamples-1-n) in inverse
    inverse[numSamples - 1 - n] = sweep[n] * amplitude
  }

  // Normalise so max(abs) = 1
  let maxAbs = 0
  for (let n = 0; n < numSamples; n++) {
    const a = Math.abs(inverse[n])
    if (a > maxAbs) maxAbs = a
  }
  if (maxAbs > 0) {
    const scale = 1 / maxAbs
    for (let n = 0; n < numSamples; n++) {
      inverse[n] *= scale
    }
  }

  return inverse
}

/**
 * Estimate the instantaneous frequency at a given sample index
 * by measuring the zero-crossing rate over a short window.
 *
 * This is useful for sanity-checking that the sweep starts and
 * ends near the expected frequencies.
 */
export function estimateInstantaneousFrequency(
  buffer: Float32Array,
  centerSample: number,
  sampleRate: number,
  windowSamples: number = 256,
): number {
  const halfWin = Math.floor(windowSamples / 2)
  const start = Math.max(0, centerSample - halfWin)
  const end = Math.min(buffer.length - 1, centerSample + halfWin)

  let crossings = 0
  for (let i = start + 1; i <= end; i++) {
    if (
      (buffer[i - 1] >= 0 && buffer[i] < 0) ||
      (buffer[i - 1] < 0 && buffer[i] >= 0)
    ) {
      crossings++
    }
  }

  const windowDuration = (end - start) / sampleRate
  // Each full cycle has 2 zero crossings
  return crossings / (2 * windowDuration)
}

/** Validate sweep parameters. */
function validateSweepParams(params: SweepParams): void {
  const { fStart, fEnd, durationSec, sampleRate } = params

  if (fStart <= 0) throw new RangeError('fStart must be > 0')
  if (fEnd <= fStart) throw new RangeError('fEnd must be > fStart')
  if (durationSec <= 0) throw new RangeError('durationSec must be > 0')
  if (sampleRate <= 0) throw new RangeError('sampleRate must be > 0')
  if (fEnd > sampleRate / 2) {
    throw new RangeError('fEnd must be <= sampleRate / 2 (Nyquist)')
  }
}
