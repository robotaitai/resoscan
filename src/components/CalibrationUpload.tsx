/**
 * CalibrationUpload — file input for microphone calibration data.
 *
 * Displays an "uncalibrated / calibrated" badge and allows
 * uploading / clearing a calibration .txt file.
 */

import { useRef, useCallback } from 'react'
import { parseCalibrationFile } from '../dsp/calibration'
import type { CalibrationData } from '../dsp/calibration'
import './CalibrationUpload.css'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CalibrationUploadProps {
  /** Currently loaded calibration, or null. */
  calibration: CalibrationData | null
  /** Called when a valid calibration is loaded. */
  onCalibrationChange: (cal: CalibrationData | null) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalibrationUpload({
  calibration,
  onCalibrationChange,
}: CalibrationUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = parseCalibrationFile(text, file.name)
        onCalibrationChange(data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        alert(`Failed to load calibration file:\n${msg}`)
      }

      // Reset input so re-uploading the same file triggers onChange
      if (inputRef.current) inputRef.current.value = ''
    },
    [onCalibrationChange],
  )

  const handleClear = useCallback(() => {
    onCalibrationChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [onCalibrationChange])

  return (
    <div className="calibration-upload">
      {/* Badge */}
      <span
        className={`calibration-badge ${calibration ? 'calibration-badge--active' : ''}`}
      >
        {calibration ? 'Calibrated' : 'Uncalibrated'}
      </span>

      {/* File info or upload prompt */}
      {calibration ? (
        <div className="calibration-info">
          <span className="calibration-filename" title={calibration.filename}>
            {calibration.filename}
          </span>
          <span className="calibration-points">
            ({calibration.points.length} points)
          </span>
          <button
            className="btn btn-small calibration-clear"
            onClick={handleClear}
            title="Remove calibration"
          >
            Clear
          </button>
        </div>
      ) : (
        <label className="calibration-label">
          <span className="btn btn-small">Load calibration file</span>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.cal,.csv"
            className="calibration-input"
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  )
}
