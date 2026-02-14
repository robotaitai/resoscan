/**
 * Tests for useTonePlayer constants and module structure.
 *
 * Note: The hook itself depends on Web Audio API (AudioContext,
 * OscillatorNode, GainNode), which is not available in happy-dom.
 * We test exported constants for correctness and the module's shape.
 */

import { describe, it, expect } from 'vitest'
import { DEFAULT_DURATION_SEC, FADE_SEC, TONE_GAIN } from './useTonePlayer'

describe('useTonePlayer constants', () => {
  it('DEFAULT_DURATION_SEC is a positive number of reasonable length', () => {
    expect(DEFAULT_DURATION_SEC).toBeGreaterThan(0)
    expect(DEFAULT_DURATION_SEC).toBeLessThanOrEqual(10)
  })

  it('FADE_SEC is shorter than the total duration', () => {
    expect(FADE_SEC).toBeGreaterThan(0)
    expect(FADE_SEC).toBeLessThan(DEFAULT_DURATION_SEC)
  })

  it('TONE_GAIN is between 0 and 1', () => {
    expect(TONE_GAIN).toBeGreaterThan(0)
    expect(TONE_GAIN).toBeLessThanOrEqual(1)
  })

  it('fade-out has enough time to ramp before stop', () => {
    // The fade-out starts at (duration - fade) and ends at duration.
    // There must be enough time for the ramp.
    const fadeOutStart = DEFAULT_DURATION_SEC - FADE_SEC
    expect(fadeOutStart).toBeGreaterThan(0)
  })

  it('two fades fit within the duration (fade-in + fade-out)', () => {
    expect(FADE_SEC * 2).toBeLessThan(DEFAULT_DURATION_SEC)
  })
})
