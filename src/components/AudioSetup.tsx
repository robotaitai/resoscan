import { useAudioSetup } from '../audio/useAudioSetup'
import {
  formatDeviceLabel,
  formatSampleRate,
  formatBooleanSetting,
} from '../audio/format'
import './AudioSetup.css'

export function AudioSetup() {
  const {
    permission,
    error,
    devices,
    selectedDeviceId,
    trackSettings,
    requestPermission,
    selectDevice,
  } = useAudioSetup()

  return (
    <section className="audio-setup" aria-label="Audio setup">
      <h2>Audio setup</h2>

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

          {/* ----- Device selector ----- */}
          {devices.length > 0 && (
            <div className="setup-field">
              <label htmlFor="mic-select">Input device</label>
              <select
                id="mic-select"
                value={selectedDeviceId ?? ''}
                onChange={(e) => selectDevice(e.target.value)}
              >
                {devices.map((device, i) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {formatDeviceLabel(device, i)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ----- Track settings table ----- */}
          {trackSettings && (
            <div className="settings-panel">
              <h3>Browser-applied audio settings</h3>
              <p className="settings-note">
                These are the <em>actual</em> settings the browser applied. We
                requested raw input (all processing off) but the browser may
                override.
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

                  <SettingRow
                    label="Sample rate"
                    value={formatSampleRate(trackSettings.sampleRate)}
                  />

                  {trackSettings.channelCount != null && (
                    <SettingRow
                      label="Channels"
                      value={String(trackSettings.channelCount)}
                    />
                  )}

                  <BoolRow
                    label="Echo cancellation"
                    actual={trackSettings.echoCancellation}
                  />
                  <BoolRow
                    label="Noise suppression"
                    actual={trackSettings.noiseSuppression}
                  />
                  <BoolRow
                    label="Auto gain control"
                    actual={trackSettings.autoGainControl}
                  />
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/* ---------- small sub-components ---------- */

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{value}</td>
    </tr>
  )
}

function BoolRow({
  label,
  actual,
}: {
  label: string
  actual: boolean | undefined
}) {
  const { text, overridden } = formatBooleanSetting(false, actual)
  return (
    <tr>
      <td>{label}</td>
      <td className={overridden ? 'warn' : 'good'}>{text}</td>
    </tr>
  )
}
