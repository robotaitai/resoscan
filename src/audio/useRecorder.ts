import { useState, useCallback, useRef, useEffect } from 'react'
import {
  COUNTDOWN_SECONDS,
  RECORDER_PROCESSOR_PATH,
  STOP_DRAIN_DELAY_MS,
  PREFERRED_SAMPLE_RATE,
} from '../constants'
import { concatChunks, computeRms, detectClipping } from './recording'

export type RecorderState =
  | 'idle'
  | 'countdown'
  | 'recording'
  | 'stopping'
  | 'done'
  | 'error'

export interface RecordingResult {
  /** The concatenated raw PCM buffer (mono, Float32). */
  buffer: Float32Array
  /** Sample rate of the recording. */
  sampleRate: number
  /** Duration in seconds. */
  durationSec: number
  /** RMS level. */
  rms: number
  /** Whether clipping was detected. */
  clipped: boolean
  /** Number of clipped samples. */
  clippedSampleCount: number
  /** Peak absolute value. */
  peak: number
}

export interface UseRecorderOptions {
  /** Pre-roll countdown duration in seconds. */
  countdownSec?: number
}

export interface UseRecorderReturn {
  state: RecorderState
  countdownRemaining: number
  result: RecordingResult | null
  error: string | null
  startRecording: (stream: MediaStream) => void
  stopRecording: () => void
  reset: () => void
}

export function useRecorder(
  options: UseRecorderOptions = {},
): UseRecorderReturn {
  const { countdownSec = COUNTDOWN_SECONDS } = options

  const [state, setState] = useState<RecorderState>('idle')
  const [countdownRemaining, setCountdownRemaining] = useState(0)
  const [result, setResult] = useState<RecordingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** Tear down the entire audio graph and timers. */
  const teardown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'stop' })
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [])

  /** Set up AudioWorklet and begin capturing PCM chunks. */
  const beginCapture = useCallback(async (stream: MediaStream) => {
    try {
      const ctx = new AudioContext()
      audioCtxRef.current = ctx

      await ctx.audioWorklet.addModule(RECORDER_PROCESSOR_PATH)

      const source = ctx.createMediaStreamSource(stream)
      sourceNodeRef.current = source

      const worklet = new AudioWorkletNode(ctx, 'recorder-processor')
      workletNodeRef.current = worklet

      worklet.port.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'chunk') {
          chunksRef.current.push(event.data.buffer as Float32Array)
        }
      }

      // mic → worklet (don't connect to destination — no monitoring)
      source.connect(worklet)

      worklet.port.postMessage({ type: 'start' })
      setState('recording')
    } catch (err) {
      setState('error')
      setError(
        err instanceof Error ? err.message : 'Failed to start recording.',
      )
    }
  }, [])

  /** Start a pre-roll countdown, then begin capture. */
  const startRecording = useCallback(
    (stream: MediaStream) => {
      setResult(null)
      setError(null)
      chunksRef.current = []

      setState('countdown')
      setCountdownRemaining(countdownSec)

      let remaining = countdownSec

      countdownTimerRef.current = setInterval(() => {
        remaining -= 1
        setCountdownRemaining(remaining)

        if (remaining <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
          }
          beginCapture(stream)
        }
      }, 1000)
    },
    [countdownSec, beginCapture],
  )

  /** Stop recording, drain remaining chunks, and produce a result. */
  const stopRecording = useCallback(() => {
    setState('stopping')

    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'stop' })
    }

    // Allow in-flight chunks to arrive before concatenating.
    setTimeout(() => {
      const sampleRate =
        audioCtxRef.current?.sampleRate ?? PREFERRED_SAMPLE_RATE
      const buffer = concatChunks(chunksRef.current)
      const rms = computeRms(buffer)
      const { clipped, clippedSampleCount, peak } = detectClipping(buffer)
      const durationSec = buffer.length / sampleRate

      setResult({
        buffer,
        sampleRate,
        durationSec,
        rms,
        clipped,
        clippedSampleCount,
        peak,
      })

      teardown()
      setState('done')
    }, STOP_DRAIN_DELAY_MS)
  }, [teardown])

  /** Reset to idle for a new recording. */
  const reset = useCallback(() => {
    teardown()
    setState('idle')
    setResult(null)
    setError(null)
    setCountdownRemaining(0)
    chunksRef.current = []
  }, [teardown])

  /** Clean up on unmount. */
  useEffect(() => {
    return () => {
      teardown()
    }
  }, [teardown])

  return {
    state,
    countdownRemaining,
    result,
    error,
    startRecording,
    stopRecording,
    reset,
  }
}
