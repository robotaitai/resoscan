/**
 * ResonanceList — displays detected resonance peaks in a sortable table.
 * Clicking a row highlights the peak on the frequency response chart.
 * Each row has a Play button to audition the frequency as a sine tone.
 */

import type { DetectedPeak } from '../dsp/peakDetection'
import type { TonePlayerState } from '../audio/useTonePlayer'
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
  /** Tone player for auditioning peaks. */
  tonePlayer?: TonePlayerState
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResonanceList({
  peaks,
  highlightedFreq,
  onSelectPeak,
  tonePlayer,
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
            {tonePlayer && <th>Listen</th>}
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
                {tonePlayer && (
                  <td className="resonance-play">
                    <PlayButton freq={peak.freq} tonePlayer={tonePlayer} />
                  </td>
                )}
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
// Sub-components
// ---------------------------------------------------------------------------

function PlayButton({
  freq,
  tonePlayer,
}: {
  freq: number
  tonePlayer: TonePlayerState
}) {
  const isThisPlaying =
    tonePlayer.isPlaying &&
    tonePlayer.playingFreq !== null &&
    Math.abs(tonePlayer.playingFreq - freq) / freq < 0.001

  return (
    <button
      className={`btn btn-small resonance-play-btn ${isThisPlaying ? 'resonance-play-btn--active' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        if (isThisPlaying) {
          tonePlayer.stop()
        } else {
          tonePlayer.play(freq)
        }
      }}
      title={isThisPlaying ? 'Stop tone' : `Play ${formatFrequency(freq)}`}
      aria-label={
        isThisPlaying ? 'Stop tone' : `Play tone at ${formatFrequency(freq)}`
      }
    >
      {isThisPlaying ? '\u25A0' : '\u25B6'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFrequency(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(2)} kHz`
  return `${hz.toFixed(1)} Hz`
}
