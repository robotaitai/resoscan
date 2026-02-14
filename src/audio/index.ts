/**
 * Audio module — mic permissions, device management, recording,
 * measurement orchestration, and formatting.
 */

export type {
  MicPermission,
  AudioTrackSettings,
  MicDevice,
  OutputDevice,
  MeasurementMeta,
  MeasurementResult,
  ImpulseResponseData,
  LevelData,
} from './types'
export type { AudioSetupState } from './useAudioSetup'
export type {
  RecorderState,
  RecordingResult,
  UseRecorderReturn,
} from './useRecorder'
export type { MeasurementState, UseMeasurementReturn } from './useMeasurement'
export type { TonePlayerState } from './useTonePlayer'
export type { ClippingResult } from './recording'

export { useAudioSetup } from './useAudioSetup'
export { useRecorder } from './useRecorder'
export { useMeasurement } from './useMeasurement'
export { useTonePlayer } from './useTonePlayer'

export {
  concatChunks,
  computeRms,
  computePeak,
  detectClipping,
  computeChunkLevel,
  downsampleForWaveform,
} from './recording'

export {
  formatDeviceLabel,
  formatSampleRate,
  formatProcessingSetting,
  formatDuration,
  bufferDuration,
  summariseSettings,
  deduplicateDevices,
} from './format'
