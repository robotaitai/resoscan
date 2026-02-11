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
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setScreen('setup')}
            >
              Start measurement
            </button>
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
