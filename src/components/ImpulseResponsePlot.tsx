import { useMemo } from 'react'
import { IR_PLOT_BAR_COUNT } from '../constants'
import type { ImpulseResponseData } from '../audio/types'
import { formatDuration } from '../audio/format'
import './ImpulseResponsePlot.css'

interface ImpulseResponsePlotProps {
  data: ImpulseResponseData
  sampleRate: number
}

/**
 * Time-domain impulse response plot.
 *
 * Renders the IR as a signed waveform (positive and negative values)
 * with a centred zero line. Bars extend up or down from the centre.
 */
export function ImpulseResponsePlot({
  data,
  sampleRate,
}: ImpulseResponsePlotProps) {
  const bars = useMemo(
    () => downsampleIR(data.ir, IR_PLOT_BAR_COUNT),
    [data.ir],
  )

  const durationSec = data.ir.length / sampleRate

  return (
    <div className="ir-plot">
      <h3>Impulse Response</h3>
      <p className="ir-plot-subtitle">
        {data.ir.length.toLocaleString()} samples &middot;{' '}
        {formatDuration(durationSec)}
      </p>

      <div className="ir-waveform" aria-label="Impulse response waveform">
        {bars.map((v, i) => {
          const heightPercent = Math.abs(v) * 50 // 50% = full height from centre
          const isPositive = v >= 0
          return (
            <div key={i} className="ir-bar-col">
              <div
                className={`ir-bar ${isPositive ? 'ir-bar-pos' : 'ir-bar-neg'}`}
                style={{ height: `${Math.max(heightPercent, 0.5)}%` }}
              />
            </div>
          )
        })}
        {/* Zero line */}
        <div className="ir-zero-line" />
      </div>

      {/* Time axis labels */}
      <div className="ir-time-axis">
        <span>0 ms</span>
        <span>{formatDuration(durationSec / 2)}</span>
        <span>{formatDuration(durationSec)}</span>
      </div>

      {/* Stats */}
      <table className="settings-table ir-stats">
        <tbody>
          <tr>
            <td>Peak index (pre-align)</td>
            <td>{data.peakIndex.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Raw peak amplitude</td>
            <td>{data.rawPeak.toFixed(6)}</td>
          </tr>
          <tr>
            <td>IR duration</td>
            <td>{formatDuration(durationSec)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Downsample a signed IR to a fixed number of bars.
 * Each bar is the sample with the largest absolute value in its window,
 * preserving the sign for a bipolar waveform display.
 */
function downsampleIR(ir: Float32Array, numBars: number): number[] {
  if (ir.length === 0 || numBars <= 0) return []

  const bars: number[] = new Array(numBars)
  const samplesPerBar = ir.length / numBars

  for (let i = 0; i < numBars; i++) {
    const start = Math.floor(i * samplesPerBar)
    const end = Math.min(Math.floor((i + 1) * samplesPerBar), ir.length)
    let maxVal = 0
    for (let j = start; j < end; j++) {
      if (Math.abs(ir[j]) > Math.abs(maxVal)) {
        maxVal = ir[j]
      }
    }
    bars[i] = maxVal
  }

  return bars
}
