import { useState } from 'react'
import { AudioSetup } from './components/AudioSetup'
import './App.css'

type Screen = 'landing' | 'setup'

function App() {
  const [screen, setScreen] = useState<Screen>('landing')

  return (
    <div className="app">
      <header className="header">
        <h1>ResoScan</h1>
        <p className="subtitle">Room resonance measurement tool</p>
        <p className="range">Sweep range: 20 Hz – 15,000 Hz</p>
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

        {screen === 'setup' && <AudioSetup />}
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
