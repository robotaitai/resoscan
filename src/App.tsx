import { useEffect, useState } from 'react'
import { SWEEP_FREQ_START, SWEEP_FREQ_END } from './constants'
import { AudioSetup } from './components/AudioSetup'
import { MeasurementPanel } from './components/MeasurementPanel'
import './App.css'

type Screen = 'landing' | 'setup' | 'measure'

function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null)
  const [activeOutputDeviceId, setActiveOutputDeviceId] = useState<
    string | null
  >(null)

  // Stop stream tracks when we leave the measurement screen or on unmount
  useEffect(() => {
    return () => {
      activeStream?.getTracks().forEach((t) => t.stop())
    }
  }, [activeStream])

  const handleProceed = (
    stream: MediaStream,
    outputDeviceId: string | null,
  ) => {
    setActiveStream(stream)
    setActiveOutputDeviceId(outputDeviceId)
    setScreen('measure')
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ResoScan</h1>
        <p className="subtitle">Room resonance measurement tool</p>
        <p className="range">
          Sweep range: {SWEEP_FREQ_START} Hz – {SWEEP_FREQ_END.toLocaleString()}{' '}
          Hz
        </p>
      </header>

      <main className="main">
        {screen === 'landing' && (
          <div className="landing">
            <p className="landing-intro">
              ResoScan plays a sine sweep through your speakers and records the
              room response through your microphone to identify resonant
              frequencies.
            </p>
            <ol className="how-it-works">
              <li>
                <strong>Play</strong> &mdash; a logarithmic sine sweep fills
                your room
              </li>
              <li>
                <strong>Record</strong> &mdash; your mic captures the room
                response
              </li>
              <li>
                <strong>Analyze</strong> &mdash; FFT reveals resonances, RT60
                &amp; waterfall
              </li>
            </ol>
            <div className="landing-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setScreen('setup')}
              >
                Start measurement
              </button>
              <a
                href="https://github.com/robotaitai/resoscan"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-github"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                </svg>
                Star us on GitHub
              </a>
            </div>
            <span className="tech-badge">
              <span className="dot" />
              Web Audio API &middot; Open Source
            </span>
            <p className="hint">
              You will be asked for microphone permission in the next step.
            </p>
          </div>
        )}

        {screen === 'setup' && <AudioSetup onProceed={handleProceed} />}

        {screen === 'measure' && activeStream && (
          <MeasurementPanel
            stream={activeStream}
            outputDeviceId={activeOutputDeviceId}
          />
        )}
      </main>

      <footer className="footer">
        <p>
          External speakers assumed &middot; MIT License &middot;{' '}
          <a
            href="https://github.com/robotaitai/resoscan"
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
