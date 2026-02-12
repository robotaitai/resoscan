/**
 * EQView — DAW-style parametric EQ visualization.
 *
 * Renders the frequency response as a filled gradient curve on a dark
 * background, styled like FabFilter Pro-Q / DAW channel EQ displays
 * that musicians are familiar with.
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import type { FrequencyPoint } from '../dsp/frequencyResponse'
import { SWEEP_FREQ_START, SWEEP_FREQ_END } from '../constants'
import './EQView.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_MIN = -30
const DB_MAX = 18
const DB_TICK_STEP = 6 // ±6 dB steps, like a real EQ
const PADDING = { top: 16, right: 16, bottom: 36, left: 44 }

const FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000]

/** Frequency band labels shown along the top, like a DAW EQ. */
const BANDS: { label: string; freq: number }[] = [
  { label: 'Sub', freq: 40 },
  { label: 'Bass', freq: 120 },
  { label: 'Low Mid', freq: 400 },
  { label: 'Mid', freq: 1000 },
  { label: 'Hi Mid', freq: 3000 },
  { label: 'Presence', freq: 6000 },
  { label: 'Air', freq: 12000 },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EQViewProps {
  /** Computed frequency response points (after windowing, calibration, smoothing). */
  points: FrequencyPoint[]
  /** Frequency to highlight (from resonance list click), or null. */
  highlightedFreq?: number | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EQView({ points, highlightedFreq }: EQViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 300 })
  const [hover, setHover] = useState<FrequencyPoint | null>(null)

  // ---- Coordinate helpers ----

  const plotW = canvasSize.w - PADDING.left - PADDING.right

  const xToFreq = useCallback(
    (x: number) => {
      const dpr = window.devicePixelRatio || 1
      const cssX = x / dpr
      const logMin = Math.log10(SWEEP_FREQ_START)
      const logMax = Math.log10(SWEEP_FREQ_END)
      const t = (cssX - PADDING.left) / (plotW / dpr)
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
          h: Math.round(Math.min(width * 0.5, 360) * dpr),
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

    // Background — dark like a DAW EQ
    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, w, h)

    // Coordinate mapping
    const logMin = Math.log10(SWEEP_FREQ_START)
    const logMax = Math.log10(SWEEP_FREQ_END)
    const fX = (freq: number) =>
      PADDING.left + ((Math.log10(freq) - logMin) / (logMax - logMin)) * pW
    const dY = (db: number) => {
      const c = Math.max(DB_MIN, Math.min(DB_MAX, db))
      return PADDING.top + ((DB_MAX - c) / (DB_MAX - DB_MIN)) * pH
    }

    // ---- Grid ----
    ctx.strokeStyle = '#1e2030'
    ctx.lineWidth = 0.5

    // Vertical grid (frequency)
    for (const f of FREQ_TICKS) {
      const x = fX(f)
      ctx.beginPath()
      ctx.moveTo(x, PADDING.top)
      ctx.lineTo(x, PADDING.top + pH)
      ctx.stroke()
    }

    // Horizontal grid (dB)
    for (let db = DB_MIN; db <= DB_MAX; db += DB_TICK_STEP) {
      const y = dY(db)
      ctx.strokeStyle = db === 0 ? '#3a3f55' : '#1e2030'
      ctx.lineWidth = db === 0 ? 1 : 0.5
      ctx.beginPath()
      ctx.moveTo(PADDING.left, y)
      ctx.lineTo(PADDING.left + pW, y)
      ctx.stroke()
    }

    // ---- Band labels (top) ----
    ctx.font = '9px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#4a5068'
    for (const band of BANDS) {
      const x = fX(band.freq)
      if (x > PADDING.left + 10 && x < w - PADDING.right - 10) {
        ctx.fillText(band.label, x, 3)
      }
    }

    // ---- Frequency labels (bottom) ----
    ctx.fillStyle = '#6b7280'
    ctx.font = '9px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const f of FREQ_TICKS) {
      const x = fX(f)
      const label = f >= 1000 ? `${f / 1000}k` : `${f}`
      ctx.fillText(label, x, PADDING.top + pH + 4)
    }

    // Hz label
    ctx.fillText('Hz', PADDING.left + pW / 2, PADDING.top + pH + 18)

    // ---- dB labels (left) ----
    ctx.fillStyle = '#6b7280'
    ctx.font = '9px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let db = DB_MIN; db <= DB_MAX; db += DB_TICK_STEP) {
      const sign = db > 0 ? '+' : ''
      ctx.fillText(`${sign}${db}`, PADDING.left - 6, dY(db))
    }

    // ---- Build curve path ----
    ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      const x = fX(points[i].freq)
      const y = dY(points[i].db)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    // ---- Gradient fill under curve ----
    const fillPath = new Path2D()
    for (let i = 0; i < points.length; i++) {
      const x = fX(points[i].freq)
      const y = dY(points[i].db)
      if (i === 0) fillPath.moveTo(x, y)
      else fillPath.lineTo(x, y)
    }
    fillPath.lineTo(fX(points[points.length - 1].freq), PADDING.top + pH)
    fillPath.lineTo(fX(points[0].freq), PADDING.top + pH)
    fillPath.closePath()

    // Gradient: teal at top → transparent at 0dB line
    const grad = ctx.createLinearGradient(0, PADDING.top, 0, PADDING.top + pH)
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)') // sky-400
    grad.addColorStop(0.4, 'rgba(56, 189, 248, 0.15)')
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.02)')
    ctx.fillStyle = grad
    ctx.fill(fillPath)

    // ---- Curve stroke ----
    // Glow effect
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Main line
    ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      const x = fX(points[i].freq)
      const y = dY(points[i].db)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = '#38bdf8' // sky-400
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.stroke()

    // ---- Highlighted peak ----
    if (highlightedFreq != null) {
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

      // Vertical line
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.5)' // orange-400
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(hx, PADDING.top)
      ctx.lineTo(hx, PADDING.top + pH)
      ctx.stroke()
      ctx.setLineDash([])

      // Dot
      ctx.beginPath()
      ctx.arc(hx, hy, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#fb923c' // orange-400
      ctx.fill()
      ctx.strokeStyle = '#0f1117'
      ctx.lineWidth = 2
      ctx.stroke()

      // Label
      ctx.fillStyle = '#fb923c'
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif'
      ctx.textAlign = hx > w / 2 ? 'right' : 'left'
      ctx.textBaseline = 'bottom'
      const lx = hx + (hx > w / 2 ? -10 : 10)
      const freqLabel =
        closest.freq >= 1000
          ? `${(closest.freq / 1000).toFixed(2)} kHz`
          : `${closest.freq.toFixed(1)} Hz`
      ctx.fillText(`${freqLabel}  ${closest.db.toFixed(1)} dB`, lx, hy - 8)
    }

    // ---- Hover crosshair ----
    if (hover) {
      const hx = fX(hover.freq)
      const hy = dY(hover.db)

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)' // slate-400
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(hx, PADDING.top)
      ctx.lineTo(hx, PADDING.top + pH)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(PADDING.left, hy)
      ctx.lineTo(PADDING.left + pW, hy)
      ctx.stroke()
      ctx.setLineDash([])

      // Dot
      ctx.beginPath()
      ctx.arc(hx, hy, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#38bdf8'
      ctx.fill()
      ctx.strokeStyle = '#0f1117'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Tooltip
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 10px system-ui, -apple-system, sans-serif'
      ctx.textAlign = hx > w / 2 ? 'right' : 'left'
      ctx.textBaseline = 'bottom'
      const lx = hx + (hx > w / 2 ? -8 : 8)
      const freqLabel =
        hover.freq >= 1000
          ? `${(hover.freq / 1000).toFixed(2)} kHz`
          : `${hover.freq.toFixed(1)} Hz`
      ctx.fillText(`${freqLabel}  ${hover.db.toFixed(1)} dB`, lx, hy - 6)
    }
  }, [points, hover, canvasSize, highlightedFreq])

  // ---- Hover handler ----

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || points.length === 0) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const freq = xToFreq(x * (window.devicePixelRatio || 1))

      if (freq < SWEEP_FREQ_START || freq > SWEEP_FREQ_END) {
        setHover(null)
        return
      }

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
    <div className="eq-view" ref={containerRef}>
      <div className="eq-view-header">
        <h3>EQ View</h3>
        <span className="eq-view-subtitle">Room frequency response</span>
      </div>

      <canvas
        ref={canvasRef}
        className="eq-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {hover && (
        <div className="eq-readout" aria-live="polite">
          {hover.freq >= 1000
            ? `${(hover.freq / 1000).toFixed(2)} kHz`
            : `${hover.freq.toFixed(1)} Hz`}{' '}
          &middot; {hover.db.toFixed(1)} dB
        </div>
      )}
    </div>
  )
}
