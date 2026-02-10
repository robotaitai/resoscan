import { useState, useCallback } from 'react'
import './App.css'

type MicState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

interface TrackSettings {
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  sampleRate?: number
  channelCount?: number
  deviceId?: string
  label?: string
}

function App() {
  const [micState, setMicState] = useState<MicState>('idle')
  const [trackSettings, setTrackSettings] = useState<TrackSettings | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const requestMic = useCallback(async () => {
    setMicState('requesting')
    setErrorMessage(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      const track = stream.getAudioTracks()[0]
      const settings = track.getSettings()

      setTrackSettings({
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        deviceId: settings.deviceId,
        label: track.label,
      })

      // Stop tracks for now — later steps will keep the stream open
      stream.getTracks().forEach((t) => t.stop())

      setMicState('granted')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setMicState('denied')
        setErrorMessage('Microphone permission was denied.')
      } else {
        setMicState('error')
        setErrorMessage(
          err instanceof Error ? err.message : 'Unknown error occurred.',
        )
      }
    }
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>ResoScan</h1>
        <p className="subtitle">Room resonance measurement tool</p>
        <p className="range">Sweep range: 20 Hz – 15,000 Hz</p>
      </header>

      <main className="main">
        <button
          className="start-button"
          onClick={requestMic}
          disabled={micState === 'requesting'}
        >
          {micState === 'requesting'
            ? 'Requesting mic…'
            : micState === 'granted'
              ? 'Start measurement'
              : 'Grant microphone access'}
        </button>

        {micState === 'idle' && (
          <p className="hint">Microphone permission required to begin.</p>
        )}

        {(micState === 'denied' || micState === 'error') && errorMessage && (
          <p className="error" role="alert">
            {errorMessage}
          </p>
        )}

        {trackSettings && (
          <section className="settings-panel" aria-label="Audio track settings">
            <h2>Actual audio track settings</h2>
            <p className="settings-note">
              These are the settings the browser actually applied (may differ
              from requested).
            </p>
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Setting</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {trackSettings.label != null && (
                  <tr>
                    <td>Device</td>
                    <td>{trackSettings.label}</td>
                  </tr>
                )}
                <tr>
                  <td>Echo cancellation</td>
                  <td
                    className={trackSettings.echoCancellation ? 'warn' : 'good'}
                  >
                    {String(trackSettings.echoCancellation)}
                    {trackSettings.echoCancellation && ' (override!)'}
                  </td>
                </tr>
                <tr>
                  <td>Noise suppression</td>
                  <td
                    className={trackSettings.noiseSuppression ? 'warn' : 'good'}
                  >
                    {String(trackSettings.noiseSuppression)}
                    {trackSettings.noiseSuppression && ' (override!)'}
                  </td>
                </tr>
                <tr>
                  <td>Auto gain control</td>
                  <td
                    className={trackSettings.autoGainControl ? 'warn' : 'good'}
                  >
                    {String(trackSettings.autoGainControl)}
                    {trackSettings.autoGainControl && ' (override!)'}
                  </td>
                </tr>
                {trackSettings.sampleRate != null && (
                  <tr>
                    <td>Sample rate</td>
                    <td>{trackSettings.sampleRate} Hz</td>
                  </tr>
                )}
                {trackSettings.channelCount != null && (
                  <tr>
                    <td>Channels</td>
                    <td>{trackSettings.channelCount}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>
          External speakers assumed &middot; MIT License &middot;{' '}
          <a
            href="https://github.com/your-username/resoscan"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
