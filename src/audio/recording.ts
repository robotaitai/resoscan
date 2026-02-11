/**
 * Pure helpers for audio recording: chunk concatenation, waveform
 * downsampling, RMS, peak detection, and clipping.
 *
 * All functions are deterministic and browser-API-free for easy testing.
 */

import { CLIPPING_THRESHOLD } from '../constants'

/**
 * Concatenate an array of Float32Array chunks into a single Float32Array.
 */
export function concatChunks(chunks: Float32Array[]): Float32Array {
  if (chunks.length === 0) return new Float32Array(0)
  if (chunks.length === 1) return chunks[0]

  let totalLength = 0
  for (const chunk of chunks) {
    totalLength += chunk.length
  }

  const result = new Float32Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

/**
 * Compute the RMS (root-mean-square) level of a buffer.
 * Returns 0 for empty buffers.
 */
export function computeRms(buffer: Float32Array): number {
  if (buffer.length === 0) return 0
  let sum = 0
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i]
  }
  return Math.sqrt(sum / buffer.length)
}

/**
 * Find the peak (maximum absolute value) in a buffer.
 * Returns 0 for empty buffers.
 */
export function computePeak(buffer: Float32Array): number {
  if (buffer.length === 0) return 0
  let peak = 0
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i])
    if (abs > peak) peak = abs
  }
  return peak
}

/** Result of clipping detection. */
export interface ClippingResult {
  clipped: boolean
  clippedSampleCount: number
  peak: number
}

/**
 * Detect whether a buffer contains clipped samples.
 * A sample is considered clipped if |sample| >= CLIPPING_THRESHOLD.
 */
export function detectClipping(buffer: Float32Array): ClippingResult {
  let count = 0
  let peak = 0
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i])
    if (abs > peak) peak = abs
    if (abs >= CLIPPING_THRESHOLD) count++
  }
  return {
    clipped: count > 0,
    clippedSampleCount: count,
    peak,
  }
}

/**
 * Compute live level data from a single audio chunk.
 * Used by the level meter during recording.
 */
export function computeChunkLevel(chunk: Float32Array): {
  rms: number
  peak: number
  clipping: boolean
} {
  if (chunk.length === 0) {
    return { rms: 0, peak: 0, clipping: false }
  }
  let sum = 0
  let peak = 0
  let hasClip = false
  for (let i = 0; i < chunk.length; i++) {
    const v = chunk[i]
    sum += v * v
    const abs = Math.abs(v)
    if (abs > peak) peak = abs
    if (abs >= CLIPPING_THRESHOLD) hasClip = true
  }
  return {
    rms: Math.sqrt(sum / chunk.length),
    peak,
    clipping: hasClip,
  }
}

/**
 * Downsample a buffer to a fixed number of "bars" for waveform display.
 * Each bar is the peak absolute value in its window.
 */
export function downsampleForWaveform(
  buffer: Float32Array,
  numBars: number,
): Float32Array {
  if (buffer.length === 0 || numBars <= 0) return new Float32Array(0)

  const bars = new Float32Array(numBars)
  const samplesPerBar = buffer.length / numBars

  for (let i = 0; i < numBars; i++) {
    const start = Math.floor(i * samplesPerBar)
    const end = Math.min(Math.floor((i + 1) * samplesPerBar), buffer.length)
    let maxAbs = 0
    for (let j = start; j < end; j++) {
      const abs = Math.abs(buffer[j])
      if (abs > maxAbs) maxAbs = abs
    }
    bars[i] = maxAbs
  }

  return bars
}
