import { useState, useCallback, useRef, useEffect } from 'react'
import {
  COUNTDOWN_SECONDS,
  RECORDER_PROCESSOR_PATH,
  STOP_DRAIN_DELAY_MS,
  PRE_ROLL_SEC,
  POST_ROLL_SEC,
  SWEEP_PLAYBACK_GAIN,
  SWEEP_FREQ_START,
  SWEEP_FREQ_END,
  SWEEP_DURATION_SEC,
  LEVEL_METER_INTERVAL_MS,
  IR_MAX_DISPLAY_SAMPLES,
} from '../constants'
import { generateLogSweep, generateInverseFilter } from '../dsp/sweep'
import { extractImpulseResponse } from '../dsp/deconvolve'
import {
  concatChunks,
  computeRms,
  detectClipping,
  computeChunkLevel,
} from './recording'
import type { MeasurementResult, LevelData } from './types'

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export type MeasurementState =
  | 'idle'
  | 'countdown'
  | 'recording' // pre-roll + sweep + post-roll in progress
  | 'playing' // subset of recording: sweep is audible
  | 'stopping'
  | 'done'
  | 'error'

export interface UseMeasurementOptions {
  /** Duration of the sine sweep in seconds (default: SWEEP_DURATION_SEC). */
  sweepDurationSec?: number
}

export interface UseMeasurementReturn {
  state: MeasurementState
  countdownRemaining: number
  /** Live level data updated every ~50 ms while recording. */
  level: LevelData
  /** Whether clipping has been detected at any point during this run. */
  clippingDetected: boolean
  /** Progress through the measurement as a label (e.g. "Pre-roll…", "Sweep…"). */
  phaseLabel: string
  result: MeasurementResult | null
  error: string | null
  /** Start a full measurement run. */
  startMeasurement: (
    stream: MediaStream,
    outputDeviceId?: string | null,
  ) => void
  /** Reset to idle for a new run. */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMeasurement(
  options: UseMeasurementOptions = {},
): UseMeasurementReturn {
  const sweepDuration = options.sweepDurationSec ?? SWEEP_DURATION_SEC
  const [state, setState] = useState<MeasurementState>('idle')
  const [countdownRemaining, setCountdownRemaining] = useState(0)
  const [level, setLevel] = useState<LevelData>({
    rms: 0,
    peak: 0,
    clipping: false,
  })
  const [clippingDetected, setClippingDetected] = useState(false)
  const [phaseLabel, setPhaseLabel] = useState('')
  const [result, setResult] = useState<MeasurementResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const latestChunkRef = useRef<Float32Array | null>(null)
  const startTimeRef = useRef<string>('')

  // ---- Teardown ----

  const teardown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current)
      levelTimerRef.current = null
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

  // ---- Level meter polling ----

  const startLevelMeter = useCallback(() => {
    levelTimerRef.current = setInterval(() => {
      const chunk = latestChunkRef.current
      if (chunk) {
        const lev = computeChunkLevel(chunk)
        setLevel(lev)
        if (lev.clipping) setClippingDetected(true)
      }
    }, LEVEL_METER_INTERVAL_MS)
  }, [])

  const stopLevelMeter = useCallback(() => {
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current)
      levelTimerRef.current = null
    }
  }, [])

  // ---- Finish ----

  const finishRun = useCallback(
    (sampleRate: number) => {
      setState('stopping')
      setPhaseLabel('Processing…')
      stopLevelMeter()

      if (workletNodeRef.current) {
        workletNodeRef.current.port.postMessage({ type: 'stop' })
      }

      setTimeout(() => {
        const buffer = concatChunks(chunksRef.current)
        const rms = computeRms(buffer)
        const { clipped, clippedSampleCount, peak } = detectClipping(buffer)
        const actualDurationSec = buffer.length / sampleRate
        const completedAt = new Date().toISOString()

        const expectedDurationSec = PRE_ROLL_SEC + sweepDuration + POST_ROLL_SEC

        // Compute impulse response via deconvolution
        let impulseResponse: MeasurementResult['impulseResponse'] = null
        try {
          const inverseFilter = generateInverseFilter({
            fStart: SWEEP_FREQ_START,
            fEnd: SWEEP_FREQ_END,
            durationSec: sweepDuration,
            sampleRate,
          })
          const irResult = extractImpulseResponse(
            buffer,
            inverseFilter,
            IR_MAX_DISPLAY_SAMPLES,
          )
          impulseResponse = {
            ir: irResult.ir,
            peakIndex: irResult.peakIndex,
            rawPeak: irResult.rawPeak,
          }
        } catch {
          // Deconvolution failed — non-critical, leave null
        }

        setResult({
          buffer,
          meta: {
            sampleRate,
            fStart: SWEEP_FREQ_START,
            fEnd: SWEEP_FREQ_END,
            sweepDurationSec: sweepDuration,
            preRollSec: PRE_ROLL_SEC,
            postRollSec: POST_ROLL_SEC,
            startedAt: startTimeRef.current,
            completedAt,
            expectedDurationSec,
          },
          rms,
          peak,
          clipped,
          clippedSampleCount,
          actualDurationSec,
          impulseResponse,
        })

        teardown()
        setState('done')
        setPhaseLabel('Measurement complete')
      }, STOP_DRAIN_DELAY_MS)
    },
    [stopLevelMeter, teardown, sweepDuration],
  )

  // ---- Core: set up graph and run ----

  const runMeasurement = useCallback(
    async (stream: MediaStream, outputDeviceId: string | null) => {
      startTimeRef.current = new Date().toISOString()

      try {
        // 1. Create AudioContext + worklet
        const ctx = new AudioContext()
        audioCtxRef.current = ctx
        const sampleRate = ctx.sampleRate

        // Route playback to selected output device (if supported)
        if (outputDeviceId) {
          const setSink = (ctx as { setSinkId?: (id: string) => Promise<void> })
            .setSinkId
          if (setSink) {
            try {
              await setSink.call(ctx, outputDeviceId)
            } catch {
              // Fallback to default output if setSinkId fails
            }
          }
        }

        await ctx.audioWorklet.addModule(RECORDER_PROCESSOR_PATH)

        // 2. Wire mic → worklet (for recording)
        const source = ctx.createMediaStreamSource(stream)
        sourceNodeRef.current = source

        const worklet = new AudioWorkletNode(ctx, 'recorder-processor')
        workletNodeRef.current = worklet

        worklet.port.onmessage = (event: MessageEvent) => {
          if (event.data.type === 'chunk') {
            const buf = event.data.buffer as Float32Array
            chunksRef.current.push(buf)
            latestChunkRef.current = buf
          }
        }

        source.connect(worklet)

        // Connect worklet → silent gain → destination so the browser keeps
        // processing the worklet node (some engines skip disconnected nodes).
        const silentGain = ctx.createGain()
        silentGain.gain.value = 0
        worklet.connect(silentGain)
        silentGain.connect(ctx.destination)

        // 3. Start recording
        worklet.port.postMessage({ type: 'start' })
        setState('recording')
        setPhaseLabel('Pre-roll silence…')
        startLevelMeter()

        // 4. Generate sweep buffer
        const sweepData = generateLogSweep({
          fStart: SWEEP_FREQ_START,
          fEnd: SWEEP_FREQ_END,
          durationSec: sweepDuration,
          sampleRate,
        })

        const sweepBuffer = ctx.createBuffer(1, sweepData.length, sampleRate)
        sweepBuffer.getChannelData(0).set(sweepData)

        // 5. Schedule: pre-roll → sweep → post-roll → stop
        const sweepStartTime = ctx.currentTime + PRE_ROLL_SEC

        const sweepSource = ctx.createBufferSource()
        sweepSource.buffer = sweepBuffer

        const gainNode = ctx.createGain()
        gainNode.gain.value = SWEEP_PLAYBACK_GAIN

        sweepSource.connect(gainNode)
        gainNode.connect(ctx.destination)

        sweepSource.start(sweepStartTime)

        // Update phase label when sweep starts
        setTimeout(() => {
          setState('playing')
          setPhaseLabel('Playing sweep…')
        }, PRE_ROLL_SEC * 1000)

        // When sweep finishes → post-roll → stop
        sweepSource.onended = () => {
          setPhaseLabel('Post-roll silence…')
          setState('recording')

          setTimeout(() => {
            finishRun(sampleRate)
          }, POST_ROLL_SEC * 1000)
        }
      } catch (err) {
        teardown()
        setState('error')
        setError(err instanceof Error ? err.message : 'Measurement failed.')
      }
    },
    [startLevelMeter, finishRun, teardown, sweepDuration],
  )

  // ---- Start with countdown ----

  const startMeasurement = useCallback(
    (stream: MediaStream, outputDeviceId?: string | null) => {
      setResult(null)
      setError(null)
      setClippingDetected(false)
      setLevel({ rms: 0, peak: 0, clipping: false })
      chunksRef.current = []
      latestChunkRef.current = null

      setState('countdown')
      setCountdownRemaining(COUNTDOWN_SECONDS)
      setPhaseLabel('Get ready…')

      const deviceId = outputDeviceId ?? null
      let remaining = COUNTDOWN_SECONDS

      timerRef.current = setInterval(() => {
        remaining -= 1
        setCountdownRemaining(remaining)

        if (remaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          runMeasurement(stream, deviceId)
        }
      }, 1000)
    },
    [runMeasurement],
  )

  // ---- Reset ----

  const reset = useCallback(() => {
    teardown()
    stopLevelMeter()
    setState('idle')
    setResult(null)
    setError(null)
    setClippingDetected(false)
    setLevel({ rms: 0, peak: 0, clipping: false })
    setPhaseLabel('')
    setCountdownRemaining(0)
    chunksRef.current = []
    latestChunkRef.current = null
  }, [teardown, stopLevelMeter])

  // ---- Cleanup on unmount ----

  useEffect(() => {
    return () => {
      teardown()
      stopLevelMeter()
    }
  }, [teardown, stopLevelMeter])

  return {
    state,
    countdownRemaining,
    level,
    clippingDetected,
    phaseLabel,
    result,
    error,
    startMeasurement,
    reset,
  }
}
