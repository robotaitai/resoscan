/**
 * Application-wide constants. Single source of truth for configuration
 * values used across modules.
 */

// ---------------------------------------------------------------------------
// Sweep parameters
// ---------------------------------------------------------------------------

/** Lowest frequency in the measurement sweep (Hz). */
export const SWEEP_FREQ_START = 20

/** Highest frequency in the measurement sweep (Hz). */
export const SWEEP_FREQ_END = 15_000

/** Default sweep duration (seconds). */
export const SWEEP_DURATION_SEC = 5

/** Available sweep duration options for the UI (seconds). */
export const SWEEP_DURATION_OPTIONS = [1, 3, 5, 10] as const

// ---------------------------------------------------------------------------
// Audio constraints
// ---------------------------------------------------------------------------

/**
 * MediaTrackConstraints we request for the mic input.
 * We want raw audio — no browser processing.
 */
export const RAW_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

/** Preferred sample rate when available. */
export const PREFERRED_SAMPLE_RATE = 48_000

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

/**
 * Path to the AudioWorklet processor file (served from /public).
 * Uses Vite's BASE_URL so the path is correct regardless of deploy target
 * (GitHub Pages under /ResoScan/, Electron with ./, or local dev on /).
 */
export const RECORDER_PROCESSOR_PATH = `${import.meta.env.BASE_URL}recorder-processor.js`

/** Default pre-roll countdown before recording starts (seconds). */
export const COUNTDOWN_SECONDS = 3

/**
 * Delay (ms) after telling the worklet to stop, to allow final
 * in-flight chunks to arrive before concatenating.
 */
export const STOP_DRAIN_DELAY_MS = 100

// ---------------------------------------------------------------------------
// Measurement run timing
// ---------------------------------------------------------------------------

/** Silence before the sweep starts, so we capture the room's noise floor (seconds). */
export const PRE_ROLL_SEC = 0.3

/** Silence after the sweep ends, to capture the tail of the room response (seconds). */
export const POST_ROLL_SEC = 1.0

/** Sweep playback volume (0–1). Slightly below 1.0 to leave headroom. */
export const SWEEP_PLAYBACK_GAIN = 0.8

// ---------------------------------------------------------------------------
// Level meter
// ---------------------------------------------------------------------------

/** How often the level meter UI updates (ms). */
export const LEVEL_METER_INTERVAL_MS = 50

// ---------------------------------------------------------------------------
// Analysis thresholds
// ---------------------------------------------------------------------------

/**
 * Absolute sample value at or above which we flag clipping.
 * Slightly below 1.0 to catch near-clips too.
 */
export const CLIPPING_THRESHOLD = 0.99

// ---------------------------------------------------------------------------
// Peak detection
// ---------------------------------------------------------------------------

/** Minimum prominence (dB) for a peak to be reported as a resonance. */
export const PEAK_PROMINENCE_DB = 3

/** Maximum number of resonance peaks to display. */
export const PEAK_MAX_COUNT = 10

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** Maximum device label length before truncation. */
export const MAX_DEVICE_LABEL_LENGTH = 60

/** Number of bars rendered in the waveform preview. */
export const WAVEFORM_BAR_COUNT = 100

/** Number of bars rendered in the impulse response plot. */
export const IR_PLOT_BAR_COUNT = 200

/**
 * Maximum IR length to display (samples).
 * Limits the deconvolution output to keep the plot readable.
 * At 48 kHz this is ~0.5 s, more than enough for room IR.
 */
export const IR_MAX_DISPLAY_SAMPLES = 24_000
