/**
 * ExportToolbar — download buttons for IR (WAV), FR (CSV), and report (TXT).
 */

import { useCallback } from 'react'
import type { MeasurementResult } from '../audio/types'
import type { FrequencyPoint } from '../dsp/frequencyResponse'
import type { DetectedPeak } from '../dsp/peakDetection'
import type { RT60Result } from '../dsp/rt60'
import {
  exportWav,
  exportFrequencyResponseCsv,
  exportReport,
} from '../dsp/export'
import './ExportToolbar.css'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExportToolbarProps {
  result: MeasurementResult
  frPoints: FrequencyPoint[]
  peaks: DetectedPeak[]
  rt60: RT60Result | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportToolbar({
  result,
  frPoints,
  peaks,
  rt60,
}: ExportToolbarProps) {
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportWav = useCallback(() => {
    if (!result.impulseResponse) return
    const blob = exportWav(result.impulseResponse.ir, result.meta.sampleRate)
    downloadBlob(blob, 'resoscan-ir.wav')
  }, [result, downloadBlob])

  const handleExportCsv = useCallback(() => {
    const csv = exportFrequencyResponseCsv(frPoints)
    const blob = new Blob([csv], { type: 'text/csv' })
    downloadBlob(blob, 'resoscan-frequency-response.csv')
  }, [frPoints, downloadBlob])

  const handleExportReport = useCallback(() => {
    const report = exportReport(result, peaks, rt60)
    const blob = new Blob([report], { type: 'text/plain' })
    downloadBlob(blob, 'resoscan-report.txt')
  }, [result, peaks, rt60, downloadBlob])

  return (
    <div className="export-toolbar">
      <span className="export-label">Export</span>

      {result.impulseResponse && (
        <button
          className="btn btn-small export-btn"
          onClick={handleExportWav}
          title="Download impulse response as WAV (drag into your DAW for convolution reverb)"
        >
          IR (.wav)
        </button>
      )}

      {frPoints.length > 0 && (
        <button
          className="btn btn-small export-btn"
          onClick={handleExportCsv}
          title="Download frequency response as CSV"
        >
          FR (.csv)
        </button>
      )}

      <button
        className="btn btn-small export-btn"
        onClick={handleExportReport}
        title="Download measurement report as text"
      >
        Report (.txt)
      </button>
    </div>
  )
}
