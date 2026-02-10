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
