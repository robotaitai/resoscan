/**
 * WaterfallChart — Cumulative Spectral Decay (CSD) heatmap.
 *
 * Renders a 2D heatmap: X = frequency (log), Y = time, color = magnitude.
 * Shows how each frequency decays over time — the standard "waterfall plot".
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import type { ImpulseResponseData } from '../audio/types'
import { computeWaterfall } from '../dsp/waterfall'
import { SWEEP_FREQ_START, SWEEP_FREQ_END } from '../constants'
import './WaterfallChart.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NUM_SLICES = 40
const WINDOW_SEC = 0.3
const NUM_FREQ_POINTS = 200
const DB_RANGE = 60 // dB range for color mapping
const PADDING = { top: 16, right: 60, bottom: 36, left: 50 }

const FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WaterfallChartProps {
  data: ImpulseResponseData
  sampleRate: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WaterfallChart({ data, sampleRate }: WaterfallChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 300 })

  const waterfall = useMemo(
    () =>
      computeWaterfall(data.ir, sampleRate, {
        numSlices: NUM_SLICES,
        windowSec: WINDOW_SEC,
        numFreqPoints: NUM_FREQ_POINTS,
        fMin: SWEEP_FREQ_START,
        fMax: SWEEP_FREQ_END,
      }),
    [data.ir, sampleRate],
  )

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        setCanvasSize({
          w: Math.round(width * dpr),
          h: Math.round(Math.min(width * 0.45, 340) * dpr),
        })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || waterfall.slices.length === 0) return

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
    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, w, h)

    const logMin = Math.log10(SWEEP_FREQ_START)
    const logMax = Math.log10(SWEEP_FREQ_END)
    const fX = (freq: number) =>
      PADDING.left + ((Math.log10(freq) - logMin) / (logMax - logMin)) * pW

    const { slices, frequencies, maxDb } = waterfall
    const numSlices = slices.length
    const numFreqs = frequencies.length

    // Cell dimensions
    const cellW = pW / numFreqs
    const cellH = pH / numSlices

    // Draw heatmap cells
    for (let s = 0; s < numSlices; s++) {
      const y = PADDING.top + s * cellH
      for (let f = 0; f < numFreqs; f++) {
        const x = PADDING.left + (f / numFreqs) * pW
        const db = slices[s].magnitudeDb[f]
        const normalised = Math.max(
          0,
          Math.min(1, (db - (maxDb - DB_RANGE)) / DB_RANGE),
        )
        ctx.fillStyle = heatColor(normalised)
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5) // +0.5 to avoid gaps
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 0.5
    for (const f of FREQ_TICKS) {
      const x = fX(f)
      ctx.beginPath()
      ctx.moveTo(x, PADDING.top)
      ctx.lineTo(x, PADDING.top + pH)
      ctx.stroke()
    }

    // Frequency labels (bottom)
    ctx.fillStyle = '#6b7280'
    ctx.font = '9px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (const f of FREQ_TICKS) {
      const x = fX(f)
      const label = f >= 1000 ? `${f / 1000}k` : `${f}`
      ctx.fillText(label, x, PADDING.top + pH + 4)
    }
    ctx.fillText('Hz', PADDING.left + pW / 2, PADDING.top + pH + 18)

    // Time labels (left)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const timeSteps = 5
    for (let i = 0; i <= timeSteps; i++) {
      const sliceIdx = Math.round((i / timeSteps) * (numSlices - 1))
      const y = PADDING.top + sliceIdx * cellH
      const ms = (slices[sliceIdx].timeSec * 1000).toFixed(0)
      ctx.fillText(`${ms} ms`, PADDING.left - 6, y)
    }

    // Color scale (right side)
    const scaleW = 12
    const scaleX = w - PADDING.right + 16
    const scaleH = pH
    for (let i = 0; i < scaleH; i++) {
      const normalised = 1 - i / scaleH
      ctx.fillStyle = heatColor(normalised)
      ctx.fillRect(scaleX, PADDING.top + i, scaleW, 1.5)
    }

    // Scale labels
    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('0 dB', scaleX + scaleW + 4, PADDING.top)
    ctx.fillText(`-${DB_RANGE}`, scaleX + scaleW + 4, PADDING.top + scaleH)
  }, [waterfall, canvasSize])

  return (
    <div className="waterfall-chart" ref={containerRef}>
      <div className="waterfall-header">
        <h3>Spectral Decay (Waterfall)</h3>
        <span className="waterfall-subtitle">
          {(WINDOW_SEC * 1000).toFixed(0)} ms window · {NUM_SLICES} slices
        </span>
      </div>
      <canvas ref={canvasRef} className="waterfall-canvas" />

      <p className="waterfall-explain">
        Each row is a snapshot of the frequency spectrum at a point in time
        after the impulse. <strong>Bright/warm colors</strong> = loud,{' '}
        <strong>dark/cool colors</strong> = quiet. Frequencies that stay bright
        longer are ringing in your room — these are the problematic resonances
        that make your low end muddy or your mixes translate poorly.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Color mapping: dark blue → cyan → yellow → red → white
// ---------------------------------------------------------------------------

function heatColor(t: number): string {
  // t: 0 (cold/quiet) → 1 (hot/loud)
  if (t < 0.25) {
    // dark blue → blue
    const s = t / 0.25
    return `rgb(${Math.round(s * 20)}, ${Math.round(s * 60)}, ${Math.round(40 + s * 120)})`
  } else if (t < 0.5) {
    // blue → cyan
    const s = (t - 0.25) / 0.25
    return `rgb(${Math.round(20 + s * 10)}, ${Math.round(60 + s * 180)}, ${Math.round(160 + s * 40)})`
  } else if (t < 0.75) {
    // cyan → yellow
    const s = (t - 0.5) / 0.25
    return `rgb(${Math.round(30 + s * 225)}, ${Math.round(240 - s * 20)}, ${Math.round(200 - s * 180)})`
  } else {
    // yellow → red → white
    const s = (t - 0.75) / 0.25
    return `rgb(${Math.round(255)}, ${Math.round(220 - s * 100)}, ${Math.round(20 + s * 140)})`
  }
}
