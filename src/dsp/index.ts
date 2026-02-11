/**
 * DSP module — sweep generation, inverse filters, FFT, convolution,
 * deconvolution, and analysis utilities.
 */

export type { SweepParams } from './sweep'
export type { ImpulseResponseResult } from './deconvolve'

export {
  generateLogSweep,
  generateInverseFilter,
  estimateInstantaneousFrequency,
} from './sweep'

export { isPowerOfTwo, nextPowerOfTwo, realToComplex, fft, ifft } from './fft'

export { convolve } from './convolve'

export { extractImpulseResponse, findPeakIndex } from './deconvolve'

export { linearToDb, dbToLinear } from './analyse'

export type { FrequencyPoint } from './frequencyResponse'

export { windowIR, computeMagnitudeResponse } from './frequencyResponse'

export type { SmoothingOption } from './smoothing'

export { smoothFrequencyResponse, smoothingOptionToFraction } from './smoothing'

export type {
  FrequencyBand,
  DetectedPeak,
  PeakDetectionOptions,
} from './peakDetection'

export { detectPeaks, DEFAULT_BANDS } from './peakDetection'

export type { CalibrationPoint, CalibrationData } from './calibration'

export {
  parseCalibrationFile,
  interpolateCalibration,
  applyCalibration,
} from './calibration'
