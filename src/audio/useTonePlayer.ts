/**
 * useTonePlayer — play a sine tone at a given frequency.
 *
 * Used to audition detected resonance peaks so users can hear
 * what a particular room mode sounds like.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default tone duration in seconds. */
const DEFAULT_DURATION_SEC = 2

/** Fade-in / fade-out ramp time in seconds. */
const FADE_SEC = 0.05

/** Playback volume (0–1). */
const TONE_GAIN = 0.3

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TonePlayerState {
  /** Whether a tone is currently playing. */
  isPlaying: boolean
  /** The frequency currently being played, or null. */
  playingFreq: number | null
  /** Play a sine tone at the given frequency (Hz). Stops any current tone first. */
  play: (freq: number) => void
  /** Stop the current tone immediately. */
  stop: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTonePlayer(): TonePlayerState {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingFreq, setPlayingFreq] = useState<number | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const gain = gainRef.current
    const osc = oscRef.current
    const ctx = ctxRef.current

    if (gain && ctx) {
      // Fade out to avoid click
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_SEC)
      } catch {
        // If context is closed, just ignore
      }
    }

    if (osc) {
      try {
        osc.stop(ctxRef.current ? ctxRef.current.currentTime + FADE_SEC : 0)
      } catch {
        // Already stopped
      }
      oscRef.current = null
    }

    gainRef.current = null
    setIsPlaying(false)
    setPlayingFreq(null)
  }, [])

  const play = useCallback(
    (freq: number) => {
      // Stop any existing tone
      stop()

      const ctx = ctxRef.current ?? new AudioContext()
      ctxRef.current = ctx

      // Create oscillator → gain → destination
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(TONE_GAIN, ctx.currentTime + FADE_SEC)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      oscRef.current = osc
      gainRef.current = gain

      setIsPlaying(true)
      setPlayingFreq(freq)

      // Schedule fade-out and stop
      const fadeOutTime = DEFAULT_DURATION_SEC - FADE_SEC
      gain.gain.setValueAtTime(TONE_GAIN, ctx.currentTime + fadeOutTime)
      gain.gain.linearRampToValueAtTime(
        0,
        ctx.currentTime + DEFAULT_DURATION_SEC,
      )

      osc.onended = () => {
        setIsPlaying(false)
        setPlayingFreq(null)
        oscRef.current = null
        gainRef.current = null
      }

      osc.stop(ctx.currentTime + DEFAULT_DURATION_SEC + 0.01)

      // Safety timeout in case onended doesn't fire
      timerRef.current = setTimeout(
        () => {
          setIsPlaying(false)
          setPlayingFreq(null)
        },
        (DEFAULT_DURATION_SEC + 0.1) * 1000,
      )
    },
    [stop],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {})
        ctxRef.current = null
      }
    }
  }, [stop])

  return { isPlaying, playingFreq, play, stop }
}

// ---------------------------------------------------------------------------
// Exported constants for testing
// ---------------------------------------------------------------------------

export { DEFAULT_DURATION_SEC, FADE_SEC, TONE_GAIN }
