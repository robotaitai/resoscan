/**
 * Placeholder DSP module.
 * Will contain frequency-domain analysis for the 20 Hz – 15 kHz sweep.
 */

/** Convert a linear magnitude to decibels. */
export function linearToDb(value: number): number {
  if (value <= 0) return -Infinity
  return 20 * Math.log10(value)
}

/** Convert decibels to a linear magnitude. */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}
