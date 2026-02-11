/**
 * ResonanceList — displays detected resonance peaks in a sortable table.
 * Clicking a row highlights the peak on the frequency response chart.
 */

import type { DetectedPeak } from '../dsp/peakDetection'
import './ResonanceList.css'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResonanceListProps {
  /** Detected peaks sorted by prominence descending. */
  peaks: DetectedPeak[]
  /** Currently highlighted peak frequency (Hz), or null. */
  highlightedFreq: number | null
  /** Called when the user clicks a peak row. */
  onSelectPeak: (freq: number | null) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResonanceList({
  peaks,
  highlightedFreq,
  onSelectPeak,
}: ResonanceListProps) {
  if (peaks.length === 0) {
    return (
      <div className="resonance-list">
        <h3>Top Resonances</h3>
        <p className="resonance-empty">
          No significant resonance peaks detected.
        </p>
      </div>
    )
  }

  return (
    <div className="resonance-list">
      <h3>Top Resonances</h3>
      <table className="resonance-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Frequency</th>
            <th>Level</th>
            <th>Prominence</th>
            <th>Band</th>
          </tr>
        </thead>
        <tbody>
          {peaks.map((peak, i) => {
            const isSelected =
              highlightedFreq !== null &&
              Math.abs(peak.freq - highlightedFreq) / peak.freq < 0.001
            return (
              <tr
                key={peak.index}
                className={`resonance-row ${isSelected ? 'resonance-row--selected' : ''}`}
                onClick={() => onSelectPeak(isSelected ? null : peak.freq)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectPeak(isSelected ? null : peak.freq)
                  }
                }}
                aria-pressed={isSelected}
              >
                <td className="resonance-rank">{i + 1}</td>
                <td className="resonance-freq">{formatFrequency(peak.freq)}</td>
                <td className="resonance-db">
                  {peak.db >= 0 ? '+' : ''}
                  {peak.db.toFixed(1)} dB
                </td>
                <td className="resonance-prom">
                  +{peak.prominence.toFixed(1)} dB
                </td>
                <td className="resonance-band">{peak.band ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {highlightedFreq !== null && (
        <button
          className="btn btn-small resonance-clear"
          onClick={() => onSelectPeak(null)}
        >
          Clear selection
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFrequency(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(2)} kHz`
  return `${hz.toFixed(1)} Hz`
}
