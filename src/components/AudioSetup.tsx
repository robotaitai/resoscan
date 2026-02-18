import { useAudioSetup } from '../audio/useAudioSetup'
import {
  formatDeviceLabel,
  formatSampleRate,
  formatProcessingSetting,
} from '../audio/format'
import './AudioSetup.css'

interface AudioSetupProps {
  /** Called when user is ready to proceed to recording. */
  onProceed?: (stream: MediaStream, outputDeviceId: string | null) => void
}

export function AudioSetup({ onProceed }: AudioSetupProps) {
  const {
    permission,
    error,
    devices,
    selectedDeviceId,
    outputDevices,
    selectedOutputDeviceId,
    trackSettings,
    stream,
    requestPermission,
    selectDevice,
    selectOutputDevice,
    detachStream,
  } = useAudioSetup()

  return (
    <section className="audio-setup" aria-label="Audio setup">
      <h2 className="section-title">Audio setup</h2>

      {/* ---------- Permission request ---------- */}
      {permission !== 'granted' && (
        <div className="setup-step">
          <button
            className="btn btn-primary"
            onClick={requestPermission}
            disabled={permission === 'requesting'}
          >
            {permission === 'requesting'
              ? 'Requesting…'
              : 'Grant microphone access'}
          </button>

          {permission === 'idle' && (
            <p className="hint">Microphone permission is required to begin.</p>
          )}
        </div>
      )}

      {/* ---------- Error ---------- */}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {/* ---------- Permission granted content ---------- */}
      {permission === 'granted' && (
        <>
          <p className="permission-badge" role="status">
            Microphone permission granted
          </p>

          {/* ----- Input device selector ----- */}
          {devices.length > 0 && (
            <div className="setup-field">
              <label htmlFor="mic-select">Input device (microphone)</label>
              <select
                id="mic-select"
                value={selectedDeviceId ?? ''}
                onChange={(e) => selectDevice(e.target.value)}
              >
                {devices.map((device, i) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {formatDeviceLabel(device, i, 'input')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ----- Output device selector ----- */}
          {outputDevices.length > 0 && (
            <div className="setup-field">
              <label htmlFor="output-select">Output device (speakers)</label>
              <select
                id="output-select"
                value={selectedOutputDeviceId ?? ''}
                onChange={(e) => selectOutputDevice(e.target.value || null)}
              >
                <option value="">System default</option>
                {outputDevices.map((device, i) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {formatDeviceLabel(device, i, 'output')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ----- Track settings table ----- */}
          {trackSettings && <TrackSettingsTable settings={trackSettings} />}

          {/* ----- Proceed button ----- */}
          {onProceed && stream && (
            <div className="setup-proceed">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  detachStream()
                  onProceed(stream, selectedOutputDeviceId)
                }}
              >
                Proceed to recording
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------------------
 * Sub-components (co-located — only used by AudioSetup)
 * -------------------------------------------------------------------------*/

function TrackSettingsTable({
  settings,
}: {
  settings: NonNullable<ReturnType<typeof useAudioSetup>['trackSettings']>
}) {
  return (
    <div className="settings-panel">
      <h3>Browser-applied audio settings</h3>
      <p className="settings-note">
        These are the <em>actual</em> settings the browser applied. We requested
        raw input (all processing off) but the browser may override.
      </p>
      <table className="settings-table">
        <thead>
          <tr>
            <th>Setting</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {settings.label != null && (
            <tr>
              <td>Device</td>
              <td>{settings.label}</td>
            </tr>
          )}

          <tr>
            <td>Sample rate</td>
            <td>{formatSampleRate(settings.sampleRate)}</td>
          </tr>

          {settings.channelCount != null && (
            <tr>
              <td>Channels</td>
              <td>{settings.channelCount}</td>
            </tr>
          )}

          <ProcessingRow
            label="Echo cancellation"
            actual={settings.echoCancellation}
          />
          <ProcessingRow
            label="Noise suppression"
            actual={settings.noiseSuppression}
          />
          <ProcessingRow
            label="Auto gain control"
            actual={settings.autoGainControl}
          />
        </tbody>
      </table>
    </div>
  )
}

function ProcessingRow({
  label,
  actual,
}: {
  label: string
  actual: boolean | undefined
}) {
  const { text, overridden } = formatProcessingSetting(actual)
  return (
    <tr>
      <td>{label}</td>
      <td className={overridden ? 'warn' : 'good'}>{text}</td>
    </tr>
  )
}
