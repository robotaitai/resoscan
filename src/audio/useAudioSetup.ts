import { useState, useCallback, useEffect, useRef } from 'react'
import type { MicPermission, AudioTrackSettings, MicDevice } from './types'

/** Preferred audio constraints — we request "raw" mic input. */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
}

export interface AudioSetupState {
  /** Current permission state. */
  permission: MicPermission
  /** Error message (if any). */
  error: string | null
  /** Available input devices (populated after permission grant). */
  devices: MicDevice[]
  /** Currently-selected device ID. */
  selectedDeviceId: string | null
  /** Settings reported by the browser for the active track. */
  trackSettings: AudioTrackSettings | null
  /** Request mic permission and enumerate devices. */
  requestPermission: () => Promise<void>
  /** Switch to a different input device. */
  selectDevice: (deviceId: string) => Promise<void>
  /** Stop and release the current stream. */
  releaseStream: () => void
}

export function useAudioSetup(): AudioSetupState {
  const [permission, setPermission] = useState<MicPermission>('idle')
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MicDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [trackSettings, setTrackSettings] = useState<AudioTrackSettings | null>(
    null,
  )

  const streamRef = useRef<MediaStream | null>(null)

  /** Stop all tracks on the current stream. */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  /** Open a stream for a specific deviceId (or default). */
  const openStream = useCallback(
    async (deviceId?: string) => {
      stopStream()

      const constraints: MediaStreamConstraints = {
        audio: {
          ...AUDIO_CONSTRAINTS,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      const track = stream.getAudioTracks()[0]
      const settings = track.getSettings()

      setTrackSettings({
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        deviceId: settings.deviceId,
        label: track.label,
      })

      setSelectedDeviceId(settings.deviceId ?? deviceId ?? null)

      return stream
    },
    [stopStream],
  )

  /** Enumerate audio input devices (labels are only available after permission). */
  const enumerateDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices()
    const mics: MicDevice[] = all
      .filter((d) => d.kind === 'audioinput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label,
        groupId: d.groupId,
      }))
    setDevices(mics)
    return mics
  }, [])

  /** Request permission, open default stream, enumerate devices. */
  const requestPermission = useCallback(async () => {
    setPermission('requesting')
    setError(null)

    try {
      await openStream()
      await enumerateDevices()
      setPermission('granted')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermission('denied')
        setError('Microphone permission was denied.')
      } else {
        setPermission('error')
        setError(err instanceof Error ? err.message : 'Unknown error occurred.')
      }
    }
  }, [openStream, enumerateDevices])

  /** Switch to a different device. */
  const selectDevice = useCallback(
    async (deviceId: string) => {
      try {
        await openStream(deviceId)
        // Re-enumerate in case labels changed
        await enumerateDevices()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to switch microphone.',
        )
      }
    },
    [openStream, enumerateDevices],
  )

  /** Release stream on unmount. */
  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  return {
    permission,
    error,
    devices,
    selectedDeviceId,
    trackSettings,
    requestPermission,
    selectDevice,
    releaseStream: stopStream,
  }
}
