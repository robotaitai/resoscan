import { WAVEFORM_BAR_COUNT } from '../constants'
import { useRecorder } from '../audio/useRecorder'
import type { RecordingResult } from '../audio/useRecorder'
import { downsampleForWaveform } from '../audio/recording'
import { formatDuration } from '../audio/format'
import './RecordingPanel.css'

interface RecordingPanelProps {
  /** The active mic stream from AudioSetup. */
  stream: MediaStream
}

export function RecordingPanel({ stream }: RecordingPanelProps) {
  const {
    state,
    countdownRemaining,
    result,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useRecorder()

  return (
    <section className="recording-panel" aria-label="Recording">
      <h2>Record</h2>

      {/* ---------- Controls ---------- */}
      <div className="recording-controls">
        {state === 'idle' && (
          <button
            className="btn btn-record"
            onClick={() => startRecording(stream)}
          >
            Start recording
          </button>
        )}

        {state === 'countdown' && (
          <div className="countdown" role="status" aria-live="polite">
            <span className="countdown-number">{countdownRemaining}</span>
            <p className="countdown-label">Get ready…</p>
          </div>
        )}

        {state === 'recording' && (
          <>
            <div className="recording-indicator" role="status">
              <span className="recording-dot" />
              Recording…
            </div>
            <button className="btn btn-stop" onClick={stopRecording}>
              Stop
            </button>
          </>
        )}

        {state === 'stopping' && <p className="hint">Processing…</p>}

        {state === 'done' && result && (
          <button className="btn btn-primary" onClick={reset}>
            Record again
          </button>
        )}
      </div>

      {/* ---------- Error ---------- */}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {/* ---------- Result ---------- */}
      {state === 'done' && result && <ResultDisplay result={result} />}
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Sub-component (co-located — only used by RecordingPanel)
 * -------------------------------------------------------------------------*/

function ResultDisplay({ result }: { result: RecordingResult }) {
  const waveform = downsampleForWaveform(result.buffer, WAVEFORM_BAR_COUNT)

  return (
    <div className="recording-result">
      {/* Waveform */}
      <div className="waveform" aria-label="Waveform preview">
        {Array.from(waveform).map((v, i) => (
          <div
            key={i}
            className="waveform-bar"
            style={{ height: `${Math.max(v * 100, 1)}%` }}
          />
        ))}
      </div>

      {/* Stats */}
      <table className="settings-table recording-stats">
        <tbody>
          <tr>
            <td>Duration</td>
            <td>{formatDuration(result.durationSec)}</td>
          </tr>
          <tr>
            <td>Samples</td>
            <td>{result.buffer.length.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Sample rate</td>
            <td>{(result.sampleRate / 1000).toFixed(0)} kHz</td>
          </tr>
          <tr>
            <td>RMS level</td>
            <td>{result.rms.toFixed(4)}</td>
          </tr>
          <tr>
            <td>Peak</td>
            <td>{result.peak.toFixed(4)}</td>
          </tr>
          <tr>
            <td>Clipping</td>
            <td className={result.clipped ? 'warn' : 'good'}>
              {result.clipped
                ? `Yes (${result.clippedSampleCount} samples)`
                : 'No'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
