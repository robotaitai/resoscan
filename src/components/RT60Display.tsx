/**
 * RT60Display — shows reverberation time estimation with EDC plot.
 */

import { useMemo } from 'react'
import type { ImpulseResponseData } from '../audio/types'
import { estimateRT60 } from '../dsp/rt60'
import type { RT60Result } from '../dsp/rt60'
import './RT60Display.css'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RT60DisplayProps {
  data: ImpulseResponseData
  sampleRate: number
  /** Expose result to parent for export. */
  onResult?: (result: RT60Result | null) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RT60Display({ data, sampleRate, onResult }: RT60DisplayProps) {
  const result = useMemo(() => {
    const r = estimateRT60(data.ir, sampleRate)
    onResult?.(r)
    return r
  }, [data.ir, sampleRate, onResult])

  if (!result) {
    return (
      <div className="rt60-display">
        <h3>Reverberation Time</h3>
        <p className="rt60-empty">
          Insufficient dynamic range to estimate RT60.
        </p>
      </div>
    )
  }

  return (
    <div className="rt60-display">
      <h3>Reverberation Time</h3>

      <div className="rt60-cards">
        <div className="rt60-card rt60-card--primary">
          <span className="rt60-label">RT60 (T20)</span>
          <span className="rt60-value">{result.rt60.toFixed(2)} s</span>
          <span className="rt60-hint">
            {result.rt60 < 0.3
              ? 'Very dry (studio/booth)'
              : result.rt60 < 0.6
                ? 'Controlled (mixing room)'
                : result.rt60 < 1.0
                  ? 'Medium (living room)'
                  : result.rt60 < 2.0
                    ? 'Live (concert hall)'
                    : 'Very reverberant'}
          </span>
        </div>

        {result.t30 !== null && (
          <div className="rt60-card">
            <span className="rt60-label">RT60 (T30)</span>
            <span className="rt60-value">{result.t30.toFixed(2)} s</span>
          </div>
        )}

        <div className="rt60-card">
          <span className="rt60-label">Noise floor</span>
          <span className="rt60-value">
            {result.noiseFloorDb.toFixed(1)} dB
          </span>
        </div>
      </div>
    </div>
  )
}
