import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import type { ImpulseResponseData } from '../audio/types'
import { windowIR, computeMagnitudeResponse } from '../dsp/frequencyResponse'
import type { FrequencyPoint } from '../dsp/frequencyResponse'
import {
  smoothFrequencyResponse,
  smoothingOptionToFraction,
} from '../dsp/smoothing'
import type { SmoothingOption } from '../dsp/smoothing'
import { applyCalibration } from '../dsp/calibration'
import type { CalibrationData } from '../dsp/calibration'
import { SWEEP_FREQ_START, SWEEP_FREQ_END } from '../constants'
import './FrequencyResponseChart.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_NUM_POINTS = 500
const DB_MIN = -60
const DB_MAX = 20
const PADDING = { top: 20, right: 20, bottom: 40, left: 55 }

// Tick frequencies on the log axis
const FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000]
const DB_TICK_STEP = 10

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FrequencyResponseChartProps {
  data: ImpulseResponseData
  sampleRate: number
  /** Frequency (Hz) to highlight on the chart, or null for none. */
  highlightedFreq?: number | null
  /**
   * Called whenever the computed frequency response points change,
   * so the parent can run peak detection on them.
   */
  onPointsComputed?: (points: FrequencyPoint[]) => void
  /** Optional microphone calibration to apply. */
  calibration?: CalibrationData | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FrequencyResponseChart({
  data,
  sampleRate,
  highlightedFreq,
  onPointsComputed,
  calibration,
}: FrequencyResponseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [smoothing, setSmoothing] = useState<SmoothingOption>('none')
  const [windowMs, setWindowMs] = useState(200)
  const [hover, setHover] = useState<FrequencyPoint | null>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 300 })

  // ---- Compute frequency response ----

  const points = useMemo(() => {
    const windowed = windowIR(data.ir, sampleRate, windowMs / 1000)
    const raw = computeMagnitudeResponse(
      windowed,
      sampleRate,
      SWEEP_FREQ_START,
      SWEEP_FREQ_END,
      CHART_NUM_POINTS,
    )

    // Apply calibration correction if provided
    const calibrated = calibration ? applyCalibration(raw, calibration) : raw

    const fraction = smoothingOptionToFraction(smoothing)
    return fraction > 0
      ? smoothFrequencyResponse(calibrated, fraction)
      : calibrated
  }, [data.ir, sampleRate, windowMs, smoothing, calibration])

  // Notify parent when points change
  useEffect(() => {
    onPointsComputed?.(points)
  }, [points, onPointsComputed])

  // ---- Coordinate mapping ----

  const plotW = canvasSize.w - PADDING.left - PADDING.right

  const xToFreq = useCallback(
    (x: number) => {
      const logMin = Math.log10(SWEEP_FREQ_START)
      const logMax = Math.log10(SWEEP_FREQ_END)
      const t = (x - PADDING.left) / plotW
      return Math.pow(10, logMin + t * (logMax - logMin))
    },
    [plotW],
  )

  // ---- Resize observer ----

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        setCanvasSize({
          w: Math.round(width * dpr),
          h: Math.round(Math.min(width * 0.5, 400) * dpr),
        })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // ---- Draw ----

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || points.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.w
    canvas.height = canvasSize.h
    canvas.style.width = `${canvasSize.w / dpr}px`
    canvas.style.height = `${canvasSize.h / dpr}px`
    ctx.scale(dpr, dpr)

    const w = canvasSize.w / dpr
    const h = canvasSize.h / dpr
    const pW = w - PADDING.left - PADDING.right
    const pH = h - PADDING.top - PADDING.bottom

    // Background
    ctx.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-surface-alt')
        .trim() || '#f3f4f6'
    ctx.fillRect(0, 0, w, h)

    // Colours
    const textColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text-muted')
        .trim() || '#888'
    const gridColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-border')
        .trim() || '#e5e7eb'
    const lineColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary')
        .trim() || '#2563eb'
    const highlightColor = '#ef4444' // red-500 for peak highlight

    // Helper: freq → x in CSS px
    const logMin = Math.log10(SWEEP_FREQ_START)
    const logMax = Math.log10(SWEEP_FREQ_END)
    const fX = (freq: number) =>
      PADDING.left + ((Math.log10(freq) - logMin) / (logMax - logMin)) * pW
    const dY = (db: number) => {
      const c = Math.max(DB_MIN, Math.min(DB_MAX, db))
      return PADDING.top + ((DB_MAX - c) / (DB_MAX - DB_MIN)) * pH
    }

    // ---- Grid lines ----
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 0.5

    // Vertical (frequency)
    for (const f of FREQ_TICKS) {
      const x = fX(f)
      ctx.beginPath()
      ctx.moveTo(x, PADDING.top)
      ctx.lineTo(x, PADDING.top + pH)
      ctx.stroke()
    }

    // Horizontal (dB)
    for (let db = DB_MIN; db <= DB_MAX; db += DB_TICK_STEP) {
      const y = dY(db)
      ctx.beginPath()
      ctx.moveTo(PADDING.left, y)
      ctx.lineTo(PADDING.left + pW, y)
      ctx.stroke()
    }

    // 0 dB reference line
    ctx.strokeStyle = textColor
    ctx.lineWidth = 1
    const zeroY = dY(0)
    ctx.beginPath()
    ctx.moveTo(PADDING.left, zeroY)
    ctx.lineTo(PADDING.left + pW, zeroY)
    ctx.stroke()

    // ---- Axis labels ----
    ctx.fillStyle = textColor
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    for (const f of FREQ_TICKS) {
      const x = fX(f)
      const label = f >= 1000 ? `${f / 1000}k` : `${f}`
      ctx.fillText(label, x, PADDING.top + pH + 4)
    }

    // Hz label
    ctx.fillText('Hz', PADDING.left + pW / 2, PADDING.top + pH + 20)

    // dB labels
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let db = DB_MIN; db <= DB_MAX; db += DB_TICK_STEP) {
      ctx.fillText(`${db}`, PADDING.left - 6, dY(db))
    }

    // dB axis label
    ctx.save()
    ctx.translate(12, PADDING.top + pH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillText('dB', 0, 0)
    ctx.restore()

    // ---- Plot line ----
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      const x = fX(points[i].freq)
      const y = dY(points[i].db)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // ---- Hover crosshair ----
    if (hover) {
      const hx = fX(hover.freq)
      const hy = dY(hover.db)

      // Vertical line
      ctx.strokeStyle = textColor
      ctx.lineWidth = 0.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(hx, PADDING.top)
      ctx.lineTo(hx, PADDING.top + pH)
      ctx.stroke()

      // Horizontal line
      ctx.beginPath()
      ctx.moveTo(PADDING.left, hy)
      ctx.lineTo(PADDING.left + pW, hy)
      ctx.stroke()
      ctx.setLineDash([])

      // Dot
      ctx.fillStyle = lineColor
      ctx.beginPath()
      ctx.arc(hx, hy, 4, 0, Math.PI * 2)
      ctx.fill()

      // Label
      ctx.fillStyle = textColor
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.textAlign = hx > w / 2 ? 'right' : 'left'
      ctx.textBaseline = 'bottom'
      const labelX = hx + (hx > w / 2 ? -8 : 8)
      const freqLabel =
        hover.freq >= 1000
          ? `${(hover.freq / 1000).toFixed(2)} kHz`
          : `${hover.freq.toFixed(1)} Hz`
      ctx.fillText(`${freqLabel}  ${hover.db.toFixed(1)} dB`, labelX, hy - 6)
    }

    // ---- Highlighted peak marker ----
    if (highlightedFreq != null) {
      // Find the closest point to the highlighted frequency
      let closest = points[0]
      let closestDist = Math.abs(
        Math.log10(points[0].freq) - Math.log10(highlightedFreq),
      )
      for (let i = 1; i < points.length; i++) {
        const dist = Math.abs(
          Math.log10(points[i].freq) - Math.log10(highlightedFreq),
        )
        if (dist < closestDist) {
          closestDist = dist
          closest = points[i]
        }
      }

      const hx = fX(closest.freq)
      const hy = dY(closest.db)

      // Vertical highlight line
      ctx.strokeStyle = highlightColor
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 3])
      ctx.beginPath()
      ctx.moveTo(hx, PADDING.top)
      ctx.lineTo(hx, PADDING.top + pH)
      ctx.stroke()
      ctx.setLineDash([])

      // Diamond marker
      const size = 6
      ctx.fillStyle = highlightColor
      ctx.beginPath()
      ctx.moveTo(hx, hy - size)
      ctx.lineTo(hx + size, hy)
      ctx.lineTo(hx, hy + size)
      ctx.lineTo(hx - size, hy)
      ctx.closePath()
      ctx.fill()

      // Outline
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.stroke()

      // Label
      ctx.fillStyle = highlightColor
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.textAlign = hx > w / 2 ? 'right' : 'left'
      ctx.textBaseline = 'bottom'
      const hlX = hx + (hx > w / 2 ? -10 : 10)
      const hlFreqLabel =
        closest.freq >= 1000
          ? `${(closest.freq / 1000).toFixed(2)} kHz`
          : `${closest.freq.toFixed(1)} Hz`
      ctx.fillText(
        `${hlFreqLabel}  ${closest.db.toFixed(1)} dB`,
        hlX,
        hy - size - 4,
      )
    }
  }, [points, hover, canvasSize, highlightedFreq])

  // ---- Hover handler ----

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || points.length === 0) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left

      // Convert x to frequency
      const freq = xToFreq(x)
      if (freq < SWEEP_FREQ_START || freq > SWEEP_FREQ_END) {
        setHover(null)
        return
      }

      // Find nearest point
      let closest = points[0]
      let closestDist = Math.abs(Math.log10(points[0].freq) - Math.log10(freq))
      for (let i = 1; i < points.length; i++) {
        const dist = Math.abs(Math.log10(points[i].freq) - Math.log10(freq))
        if (dist < closestDist) {
          closestDist = dist
          closest = points[i]
        }
      }

      setHover(closest)
    },
    [points, xToFreq],
  )

  const handleMouseLeave = useCallback(() => setHover(null), [])

  return (
    <div className="fr-chart" ref={containerRef}>
      <div className="fr-chart-header">
        <h3>Frequency Response</h3>
        <div className="fr-controls">
          <label className="fr-control">
            <span>Window</span>
            <select
              value={windowMs}
              onChange={(e) => setWindowMs(Number(e.target.value))}
            >
              <option value={50}>50 ms</option>
              <option value={100}>100 ms</option>
              <option value={200}>200 ms</option>
              <option value={500}>500 ms</option>
            </select>
          </label>
          <label className="fr-control">
            <span>Smoothing</span>
            <select
              value={smoothing}
              onChange={(e) => setSmoothing(e.target.value as SmoothingOption)}
            >
              <option value="none">None</option>
              <option value="1/6">1/6 octave</option>
            </select>
          </label>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="fr-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {hover && (
        <div className="fr-readout" aria-live="polite">
          {hover.freq >= 1000
            ? `${(hover.freq / 1000).toFixed(2)} kHz`
            : `${hover.freq.toFixed(1)} Hz`}{' '}
          &middot; {hover.db.toFixed(1)} dB
        </div>
      )}

      {/* Legend */}
      <div className="fr-legend">
        <span className="fr-legend-item">
          <span className="fr-legend-swatch fr-legend-swatch--line" />
          Magnitude (dB SPL, relative)
        </span>
        <span className="fr-legend-item fr-legend-tag">
          Window: {windowMs} ms
        </span>
        <span className="fr-legend-item fr-legend-tag">
          Smoothing: {smoothing === 'none' ? 'off' : smoothing + ' oct'}
        </span>
        <span
          className={`fr-legend-item fr-legend-tag ${calibration ? 'fr-legend-tag--active' : ''}`}
        >
          {calibration ? `Cal: ${calibration.filename}` : 'Uncalibrated'}
        </span>
        <span className="fr-legend-item fr-legend-tag">
          {SWEEP_FREQ_START} Hz – {(SWEEP_FREQ_END / 1000).toFixed(0)} kHz
        </span>
      </div>
    </div>
  )
}
