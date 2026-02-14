/**
 * Tests for export utilities.
 */

import { describe, it, expect } from 'vitest'
import { exportWav, exportFrequencyResponseCsv, exportReport } from './export'
import type { MeasurementResult } from '../audio/types'
import type { DetectedPeak } from './peakDetection'

describe('exportWav', () => {
  it('produces a Blob of type audio/wav', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1])
    const blob = exportWav(samples, 48000)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('audio/wav')
  })

  it('produces correct file size (44 header + 2 bytes per sample)', () => {
    const samples = new Float32Array(100)
    const blob = exportWav(samples, 48000)
    expect(blob.size).toBe(44 + 100 * 2)
  })

  it('produces valid RIFF header', async () => {
    const samples = new Float32Array(10)
    const blob = exportWav(samples, 48000)
    const buffer = await blob.arrayBuffer()
    const view = new DataView(buffer)
    // "RIFF"
    expect(
      String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3),
      ),
    ).toBe('RIFF')
    // "WAVE"
    expect(
      String.fromCharCode(
        view.getUint8(8),
        view.getUint8(9),
        view.getUint8(10),
        view.getUint8(11),
      ),
    ).toBe('WAVE')
    // Sample rate at byte 24
    expect(view.getUint32(24, true)).toBe(48000)
  })

  it('handles empty input', () => {
    const blob = exportWav(new Float32Array(0), 48000)
    expect(blob.size).toBe(44) // header only
  })
})

describe('exportFrequencyResponseCsv', () => {
  it('produces CSV with header row', () => {
    const csv = exportFrequencyResponseCsv([])
    expect(csv).toBe('Frequency (Hz),Magnitude (dB)')
  })

  it('includes all points', () => {
    const points = [
      { freq: 100, db: -10 },
      { freq: 1000, db: 0 },
      { freq: 10000, db: -5 },
    ]
    const csv = exportFrequencyResponseCsv(points)
    const lines = csv.split('\n')
    expect(lines.length).toBe(4) // header + 3 data
    expect(lines[1]).toBe('100.00,-10.00')
  })
})

describe('exportReport', () => {
  const makeResult = (): MeasurementResult => ({
    buffer: new Float32Array(1000),
    meta: {
      sampleRate: 48000,
      fStart: 20,
      fEnd: 15000,
      sweepDurationSec: 5,
      preRollSec: 0.3,
      postRollSec: 1,
      startedAt: '2026-02-10T12:00:00.000Z',
      completedAt: '2026-02-10T12:00:10.000Z',
      expectedDurationSec: 6.3,
    },
    rms: 0.05,
    peak: 0.35,
    clipped: false,
    clippedSampleCount: 0,
    actualDurationSec: 6.3,
    impulseResponse: null,
  })

  it('includes measurement metadata', () => {
    const report = exportReport(makeResult(), [], null)
    expect(report).toContain('48000 Hz')
    expect(report).toContain('20')
    expect(report).toContain('15000')
    expect(report).toContain('ResoScan')
  })

  it('includes RT60 when provided', () => {
    const rt60 = {
      rt60: 0.5,
      t20: 0.5,
      t30: 0.48,
      edcDb: new Float32Array(100),
      noiseFloorDb: -40,
    }
    const report = exportReport(makeResult(), [], rt60)
    expect(report).toContain('RT60')
    expect(report).toContain('0.50 s')
  })

  it('includes detected peaks', () => {
    const peaks: DetectedPeak[] = [
      { freq: 63, db: 5, prominence: 8, band: 'Room modes', index: 10 },
    ]
    const report = exportReport(makeResult(), peaks, null)
    expect(report).toContain('63.0 Hz')
    expect(report).toContain('Room modes')
  })
})
