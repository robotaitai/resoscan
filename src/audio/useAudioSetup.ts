import { useState, useCallback, useEffect, useRef } from 'react'
import { RAW_AUDIO_CONSTRAINTS } from '../constants'
import type {
  MicPermission,
  AudioTrackSettings,
  MicDevice,
  OutputDevice,
} from './types'

export interface AudioSetupState {
  /** Current permission state. */
  permission: MicPermission
  /** Error message (if any). */
  error: string | null
  /** Available input devices (populated after permission grant). */
  devices: MicDevice[]
  /** Currently-selected input device ID. */
  selectedDeviceId: string | null
  /** Available output devices (speakers). */
  outputDevices: OutputDevice[]
  /** Currently-selected output device ID, or null for system default. */
  selectedOutputDeviceId: string | null
  /** Settings reported by the browser for the active track. */
  trackSettings: AudioTrackSettings | null
  /** The active MediaStream (available after permission grant). */
  stream: MediaStream | null
  /** Request mic permission and enumerate devices. */
  requestPermission: () => Promise<void>
  /** Switch to a different input device. */
  selectDevice: (deviceId: string) => Promise<void>
  /** Switch to a different output device. */
  selectOutputDevice: (deviceId: string | null) => void
  /** Stop and release the current stream. */
  releaseStream: () => void
  /** Detach stream without stopping tracks (for handoff to another component). */
  detachStream: () => void
}

export function useAudioSetup(): AudioSetupState {
  const [permission, setPermission] = useState<MicPermission>('idle')
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MicDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [outputDevices, setOutputDevices] = useState<OutputDevice[]>([])
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState<
    string | null
  >(null)
  const [trackSettings, setTrackSettings] = useState<AudioTrackSettings | null>(
    null,
  )

  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  /** Stop all tracks on the current stream. */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setStream(null)
    }
  }, [])

  /**
   * Detach the stream without stopping its tracks.
   * Call this before handing the stream to another component
   * so the cleanup effect won't kill the tracks on unmount.
   */
  const detachStream = useCallback(() => {
    streamRef.current = null
    setStream(null)
  }, [])

  /** Open a stream for a specific deviceId (or default). */
  const openStream = useCallback(
    async (deviceId?: string) => {
      stopStream()

      const constraints: MediaStreamConstraints = {
        audio: {
          ...RAW_AUDIO_CONSTRAINTS,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = newStream
      setStream(newStream)

      const track = newStream.getAudioTracks()[0]
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

      return newStream
    },
    [stopStream],
  )

  /** Enumerate audio input and output devices. */
  const enumerateDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices()
    const mics: MicDevice[] = all
      .filter((d) => d.kind === 'audioinput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label,
        groupId: d.groupId,
      }))
    const outputs: OutputDevice[] = all
      .filter((d) => d.kind === 'audiooutput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label,
        groupId: d.groupId,
      }))
    setDevices(mics)
    setOutputDevices(outputs)
    return { mics, outputs }
  }, [])

  /** Switch to a different output device (null = system default). */
  const selectOutputDevice = useCallback((deviceId: string | null) => {
    setSelectedOutputDeviceId(deviceId)
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
    outputDevices,
    selectedOutputDeviceId,
    trackSettings,
    stream,
    requestPermission,
    selectDevice,
    selectOutputDevice,
    releaseStream: stopStream,
    detachStream,
  }
}
