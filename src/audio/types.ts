/** Mic permission state machine. */
export type MicPermission =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'error'

/** The subset of MediaTrackSettings we display to the user. */
export interface AudioTrackSettings {
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  sampleRate?: number
  channelCount?: number
  deviceId?: string
  label?: string
}

/** A microphone device entry for the selector. */
export interface MicDevice {
  deviceId: string
  label: string
  groupId: string
}

/** An audio output device entry for the selector. */
export interface OutputDevice {
  deviceId: string
  label: string
  groupId: string
}

/** Metadata stored alongside every measurement recording. */
export interface MeasurementMeta {
  /** Sample rate of the recording (Hz). */
  sampleRate: number
  /** Sweep start frequency (Hz). */
  fStart: number
  /** Sweep end frequency (Hz). */
  fEnd: number
  /** Sweep duration (seconds). */
  sweepDurationSec: number
  /** Pre-roll silence duration (seconds). */
  preRollSec: number
  /** Post-roll silence duration (seconds). */
  postRollSec: number
  /** ISO timestamp when the measurement started. */
  startedAt: string
  /** ISO timestamp when the measurement completed. */
  completedAt: string
  /** Total expected recording duration (pre + sweep + post). */
  expectedDurationSec: number
}

/** Result of impulse response extraction (mirrors dsp/deconvolve). */
export interface ImpulseResponseData {
  /** The normalised, auto-aligned impulse response. */
  ir: Float32Array
  /** Index of the main peak in the raw convolution output. */
  peakIndex: number
  /** Peak absolute value before normalisation. */
  rawPeak: number
}

/** Complete result of a measurement run. */
export interface MeasurementResult {
  /** Raw PCM recording buffer (mono). */
  buffer: Float32Array
  /** Measurement metadata. */
  meta: MeasurementMeta
  /** RMS level of the full recording. */
  rms: number
  /** Peak absolute value. */
  peak: number
  /** Whether clipping was detected. */
  clipped: boolean
  /** Number of clipped samples. */
  clippedSampleCount: number
  /** Actual recorded duration (seconds). */
  actualDurationSec: number
  /** Deconvolved impulse response (computed after measurement). */
  impulseResponse: ImpulseResponseData | null
}

/** Live level data emitted during recording. */
export interface LevelData {
  /** Current RMS level (0–1). */
  rms: number
  /** Current peak absolute value (0–1). */
  peak: number
  /** Whether clipping has been detected in this chunk. */
  clipping: boolean
}
