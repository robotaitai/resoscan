/**
 * RT60 estimation via Schroeder backward integration.
 *
 * Pipeline:
 *   1. Square the impulse response to get energy.
 *   2. Compute the Energy Decay Curve (EDC) via backward integration.
 *   3. Convert to dB.
 *   4. Linear regression on the -5 to -25 dB range (T20) or -5 to -35 dB (T30).
 *   5. Extrapolate the decay rate to -60 dB.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RT60Result {
  /** Estimated RT60 in seconds (extrapolated from T20). */
  rt60: number
  /** T20: time for decay from -5 dB to -25 dB, multiplied by 3. */
  t20: number
  /** T30: time for decay from -5 dB to -35 dB, multiplied by 2. Null if insufficient dynamic range. */
  t30: number | null
  /** Energy Decay Curve in dB (normalised so peak = 0 dB). */
  edcDb: Float32Array
  /** Estimated noise floor in dB. */
  noiseFloorDb: number
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Estimate RT60 from an impulse response.
 *
 * @param ir         The impulse response (time-domain samples).
 * @param sampleRate Sample rate in Hz.
 * @returns RT60 estimation, or null if the IR has insufficient energy.
 */
export function estimateRT60(
  ir: Float32Array,
  sampleRate: number,
): RT60Result | null {
  if (ir.length < 2) return null

  // 1. Squared energy
  const energy = new Float64Array(ir.length)
  for (let i = 0; i < ir.length; i++) {
    energy[i] = ir[i] * ir[i]
  }

  // 2. Schroeder backward integration (cumulative sum from end)
  const edc = new Float64Array(ir.length)
  edc[ir.length - 1] = energy[ir.length - 1]
  for (let i = ir.length - 2; i >= 0; i--) {
    edc[i] = edc[i + 1] + energy[i]
  }

  // 3. Normalise and convert to dB
  const maxEnergy = edc[0]
  if (maxEnergy <= 0) return null

  const edcDb = new Float32Array(ir.length)
  for (let i = 0; i < ir.length; i++) {
    const ratio = edc[i] / maxEnergy
    edcDb[i] = ratio > 0 ? 10 * Math.log10(ratio) : -120
  }

  // Estimate noise floor from the last 10% of the EDC
  const tailStart = Math.floor(ir.length * 0.9)
  let noiseFloorDb = 0
  let count = 0
  for (let i = tailStart; i < ir.length; i++) {
    noiseFloorDb += edcDb[i]
    count++
  }
  noiseFloorDb = count > 0 ? noiseFloorDb / count : -60

  // 4. Linear regression for T20 (-5 to -25 dB)
  const t20Fit = fitDecayRange(edcDb, sampleRate, -5, -25)
  if (!t20Fit) return null

  const t20 = 60 / t20Fit.decayRateDbPerSec // time for 60 dB decay
  const rt60 = t20

  // 5. Try T30 (-5 to -35 dB) if we have enough dynamic range
  let t30: number | null = null
  const t30Fit = fitDecayRange(edcDb, sampleRate, -5, -35)
  if (t30Fit) {
    t30 = 60 / t30Fit.decayRateDbPerSec
  }

  // Sanity: RT60 should be positive and reasonable
  if (rt60 <= 0 || rt60 > 30) return null

  return { rt60, t20, t30, edcDb, noiseFloorDb }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DecayFit {
  /** Decay rate in dB/sec (positive value = decaying). */
  decayRateDbPerSec: number
}

/**
 * Perform linear regression on the EDC between two dB thresholds.
 *
 * @param edcDb      EDC in dB (peak-normalised to 0).
 * @param sampleRate Sample rate.
 * @param startDb    Upper threshold (e.g. -5).
 * @param endDb      Lower threshold (e.g. -25).
 */
function fitDecayRange(
  edcDb: Float32Array,
  sampleRate: number,
  startDb: number,
  endDb: number,
): DecayFit | null {
  // Find the sample indices where EDC crosses the thresholds
  let startIdx = -1
  let endIdx = -1

  for (let i = 0; i < edcDb.length; i++) {
    if (startIdx < 0 && edcDb[i] <= startDb) {
      startIdx = i
    }
    if (startIdx >= 0 && edcDb[i] <= endDb) {
      endIdx = i
      break
    }
  }

  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) return null

  // Linear regression: y = edcDb, x = time in seconds
  const n = endIdx - startIdx + 1
  if (n < 3) return null

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = startIdx; i <= endIdx; i++) {
    const x = i / sampleRate
    const y = edcDb[i]
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-12) return null

  const slope = (n * sumXY - sumX * sumY) / denom

  // slope is negative (decaying), we want positive rate
  const decayRateDbPerSec = -slope

  if (decayRateDbPerSec <= 0) return null

  return { decayRateDbPerSec }
}

/**
 * Compute only the Energy Decay Curve (dB) for plotting.
 */
export function computeEDC(ir: Float32Array): Float32Array {
  const energy = new Float64Array(ir.length)
  for (let i = 0; i < ir.length; i++) {
    energy[i] = ir[i] * ir[i]
  }

  const edc = new Float64Array(ir.length)
  edc[ir.length - 1] = energy[ir.length - 1]
  for (let i = ir.length - 2; i >= 0; i--) {
    edc[i] = edc[i + 1] + energy[i]
  }

  const maxEnergy = edc[0]
  const edcDb = new Float32Array(ir.length)
  for (let i = 0; i < ir.length; i++) {
    const ratio = maxEnergy > 0 ? edc[i] / maxEnergy : 0
    edcDb[i] = ratio > 0 ? 10 * Math.log10(ratio) : -120
  }

  return edcDb
}
