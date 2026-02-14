import { useState, useCallback } from 'react'
import {
  WAVEFORM_BAR_COUNT,
  PEAK_PROMINENCE_DB,
  PEAK_MAX_COUNT,
  SWEEP_DURATION_SEC,
  SWEEP_DURATION_OPTIONS,
} from '../constants'
import { useMeasurement } from '../audio/useMeasurement'
import type { MeasurementResult, LevelData } from '../audio/types'
import { downsampleForWaveform } from '../audio/recording'
import { formatDuration } from '../audio/format'
import { detectPeaks } from '../dsp/peakDetection'
import type { DetectedPeak } from '../dsp/peakDetection'
import type { FrequencyPoint } from '../dsp/frequencyResponse'
import type { CalibrationData } from '../dsp/calibration'
import { ImpulseResponsePlot } from './ImpulseResponsePlot'
import { FrequencyResponseChart } from './FrequencyResponseChart'
import { ResonanceList } from './ResonanceList'
import { EQView } from './EQView'
import { CalibrationUpload } from './CalibrationUpload'
import { RT60Display } from './RT60Display'
import { ExportToolbar } from './ExportToolbar'
import { WaterfallChart } from './WaterfallChart'
import { useTonePlayer } from '../audio/useTonePlayer'
import type { RT60Result } from '../dsp/rt60'
import './MeasurementPanel.css'

interface MeasurementPanelProps {
  /** The active mic stream from AudioSetup. */
  stream: MediaStream
  /** Output device ID for sweep playback, or null for system default. */
  outputDeviceId?: string | null
}

export function MeasurementPanel({
  stream,
  outputDeviceId,
}: MeasurementPanelProps) {
  // Sweep duration selector (persists across runs)
  const [sweepDurationSec, setSweepDurationSec] =
    useState<number>(SWEEP_DURATION_SEC)

  const {
    state,
    countdownRemaining,
    level,
    clippingDetected,
    phaseLabel,
    result,
    error,
    startMeasurement,
    reset,
  } = useMeasurement({ sweepDurationSec })

  // Calibration persists across measurement runs
  const [calibration, setCalibration] = useState<CalibrationData | null>(null)

  const isActive =
    state === 'recording' || state === 'playing' || state === 'stopping'

  return (
    <section className="measurement-panel" aria-label="Measurement">
      <h2>Measure</h2>

      {/* ---------- Calibration ---------- */}
      <CalibrationUpload
        calibration={calibration}
        onCalibrationChange={setCalibration}
      />

      {/* ---------- Sweep duration selector ---------- */}
      {(state === 'idle' || state === 'done') && (
        <label className="sweep-duration-control">
          <span>Sweep duration</span>
          <select
            value={sweepDurationSec}
            onChange={(e) => setSweepDurationSec(Number(e.target.value))}
          >
            {SWEEP_DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} s
              </option>
            ))}
          </select>
        </label>
      )}

      {/* ---------- Controls ---------- */}
      <div className="measurement-controls">
        {state === 'idle' && (
          <button
            className="btn btn-measure"
            onClick={() => startMeasurement(stream, outputDeviceId ?? null)}
          >
            Start measurement
          </button>
        )}

        {state === 'countdown' && (
          <div className="countdown" role="status" aria-live="polite">
            <span className="countdown-number">{countdownRemaining}</span>
            <p className="countdown-label">{phaseLabel}</p>
          </div>
        )}

        {isActive && (
          <div className="measurement-active">
            <div className="phase-indicator" role="status" aria-live="polite">
              {state === 'playing' && <span className="playing-dot" />}
              {state === 'recording' && <span className="recording-dot" />}
              <span className="phase-label">{phaseLabel}</span>
            </div>

            {/* Live level meter */}
            <LevelMeter level={level} />

            {/* Clipping warning */}
            {clippingDetected && (
              <p className="warn clipping-warning" role="alert">
                Clipping detected! Consider lowering your mic input level.
              </p>
            )}
          </div>
        )}

        {state === 'done' && result && (
          <button className="btn btn-primary" onClick={reset}>
            Measure again
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
      {state === 'done' && result && (
        <MeasurementResultDisplay result={result} calibration={calibration} />
      )}
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Sub-components
 * -------------------------------------------------------------------------*/

function LevelMeter({ level }: { level: LevelData }) {
  const rmsPercent = Math.min(level.rms * 100 * 3, 100) // scale up for visibility
  const peakPercent = Math.min(level.peak * 100, 100)

  return (
    <div className="level-meter" aria-label="Audio level">
      <div className="level-meter-track">
        <div
          className={`level-meter-rms ${level.clipping ? 'level-clipping' : ''}`}
          style={{ width: `${rmsPercent}%` }}
        />
        <div className="level-meter-peak" style={{ left: `${peakPercent}%` }} />
      </div>
      <div className="level-meter-labels">
        <span>RMS {(level.rms * 100).toFixed(1)}%</span>
        <span>Peak {(level.peak * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}

function MeasurementResultDisplay({
  result,
  calibration,
}: {
  result: MeasurementResult
  calibration: CalibrationData | null
}) {
  const waveform = downsampleForWaveform(result.buffer, WAVEFORM_BAR_COUNT)

  // Frequency response points + peak detection
  const [frPoints, setFrPoints] = useState<FrequencyPoint[]>([])
  const [peaks, setPeaks] = useState<DetectedPeak[]>([])
  const [highlightedFreq, setHighlightedFreq] = useState<number | null>(null)

  // Tone player for auditioning detected peaks
  const tonePlayer = useTonePlayer()

  // RT60 result (set by RT60Display via callback)
  const [rt60, setRt60] = useState<RT60Result | null>(null)

  const handlePointsComputed = useCallback((points: FrequencyPoint[]) => {
    setFrPoints(points)
    const detected = detectPeaks(points, {
      minProminence: PEAK_PROMINENCE_DB,
      maxPeaks: PEAK_MAX_COUNT,
    })
    setPeaks(detected)
  }, [])

  return (
    <div className="measurement-result">
      <h3>Measurement complete</h3>

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

      {/* Metadata */}
      <table className="settings-table measurement-stats">
        <tbody>
          <tr>
            <td>Expected duration</td>
            <td>{formatDuration(result.meta.expectedDurationSec)}</td>
          </tr>
          <tr>
            <td>Actual duration</td>
            <td>{formatDuration(result.actualDurationSec)}</td>
          </tr>
          <tr>
            <td>Sample rate</td>
            <td>{(result.meta.sampleRate / 1000).toFixed(0)} kHz</td>
          </tr>
          <tr>
            <td>Samples</td>
            <td>{result.buffer.length.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Sweep</td>
            <td>
              {result.meta.fStart} Hz – {result.meta.fEnd.toLocaleString()} Hz (
              {result.meta.sweepDurationSec} s)
            </td>
          </tr>
          <tr>
            <td>Pre / Post roll</td>
            <td>
              {result.meta.preRollSec} s / {result.meta.postRollSec} s
            </td>
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
          <tr>
            <td>Started</td>
            <td>{new Date(result.meta.startedAt).toLocaleTimeString()}</td>
          </tr>
          <tr>
            <td>Completed</td>
            <td>{new Date(result.meta.completedAt).toLocaleTimeString()}</td>
          </tr>
        </tbody>
      </table>

      {/* Impulse response plot */}
      {result.impulseResponse && (
        <ImpulseResponsePlot
          data={result.impulseResponse}
          sampleRate={result.meta.sampleRate}
        />
      )}

      {/* Frequency response chart */}
      {result.impulseResponse && (
        <FrequencyResponseChart
          data={result.impulseResponse}
          sampleRate={result.meta.sampleRate}
          highlightedFreq={highlightedFreq}
          onPointsComputed={handlePointsComputed}
          calibration={calibration}
        />
      )}

      {/* EQ-style view */}
      {frPoints.length > 0 && (
        <EQView points={frPoints} highlightedFreq={highlightedFreq} />
      )}

      {/* Waterfall / spectral decay */}
      {result.impulseResponse && (
        <WaterfallChart
          data={result.impulseResponse}
          sampleRate={result.meta.sampleRate}
        />
      )}

      {/* Resonance peaks list */}
      <ResonanceList
        peaks={peaks}
        highlightedFreq={highlightedFreq}
        onSelectPeak={setHighlightedFreq}
        tonePlayer={tonePlayer}
      />

      {/* RT60 reverberation time */}
      {result.impulseResponse && (
        <RT60Display
          data={result.impulseResponse}
          sampleRate={result.meta.sampleRate}
          onResult={setRt60}
        />
      )}

      {/* Export toolbar */}
      <ExportToolbar
        result={result}
        frPoints={frPoints}
        peaks={peaks}
        rt60={rt60}
      />
    </div>
  )
}
