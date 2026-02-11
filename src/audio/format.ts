import { MAX_DEVICE_LABEL_LENGTH } from '../constants'
import type { AudioTrackSettings, MicDevice } from './types'

type DeviceKind = 'input' | 'output'

/**
 * Format a device label for display.
 * Browsers return empty strings before permission is granted,
 * and sometimes return very long technical labels.
 */
export function formatDeviceLabel(
  device: Pick<MicDevice, 'deviceId' | 'label'>,
  index: number,
  kind: DeviceKind = 'input',
): string {
  if (!device.label || device.label.trim() === '') {
    const fallback =
      kind === 'output' ? `Speaker ${index + 1}` : `Microphone ${index + 1}`
    return fallback
  }
  const label = device.label.trim()
  if (label.length <= MAX_DEVICE_LABEL_LENGTH) return label
  return label.slice(0, MAX_DEVICE_LABEL_LENGTH - 1) + '…'
}

/**
 * Format sample rate for display (e.g. "48 kHz" or "44.1 kHz").
 */
export function formatSampleRate(rate: number | undefined): string {
  if (rate == null) return 'Unknown'
  if (rate >= 1000) {
    const kHz = rate / 1000
    return Number.isInteger(kHz) ? `${kHz} kHz` : `${kHz.toFixed(1)} kHz`
  }
  return `${rate} Hz`
}

/**
 * Describe whether a browser-applied boolean audio processing setting
 * differs from what we requested (always `false` — raw input).
 *
 * Returns a display string and whether the browser overrode our request.
 */
export function formatProcessingSetting(actual: boolean | undefined): {
  text: string
  overridden: boolean
} {
  if (actual == null) {
    return { text: 'Unknown', overridden: false }
  }
  if (actual) {
    return { text: 'true (browser override!)', overridden: true }
  }
  return { text: 'false', overridden: false }
}

/**
 * Return a human-readable summary line for the track settings,
 * useful for at-a-glance status.
 */
export function summariseSettings(settings: AudioTrackSettings): string {
  const parts: string[] = []

  if (settings.sampleRate != null) {
    parts.push(formatSampleRate(settings.sampleRate))
  }

  if (settings.channelCount != null) {
    parts.push(`${settings.channelCount}ch`)
  }

  const overrides: string[] = []
  if (settings.echoCancellation) overrides.push('EC')
  if (settings.noiseSuppression) overrides.push('NS')
  if (settings.autoGainControl) overrides.push('AGC')

  if (overrides.length > 0) {
    parts.push(`overrides: ${overrides.join(', ')}`)
  }

  return parts.length > 0 ? parts.join(' · ') : 'No details available'
}

/**
 * Format a duration in seconds to a human-readable string.
 * e.g. 2.345 → "2.35 s", 0.123 → "123 ms"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)} ms`
  }
  return `${seconds.toFixed(2)} s`
}

/**
 * Compute the duration of a buffer in seconds.
 */
export function bufferDuration(
  sampleCount: number,
  sampleRate: number,
): number {
  if (sampleRate <= 0) return 0
  return sampleCount / sampleRate
}

/**
 * Deduplicate devices that share the same groupId
 * (e.g. the same physical mic exposed on multiple channels).
 * Keeps the first occurrence of each groupId.
 */
export function deduplicateDevices(devices: MicDevice[]): MicDevice[] {
  const seen = new Set<string>()
  return devices.filter((d) => {
    if (seen.has(d.groupId)) return false
    seen.add(d.groupId)
    return true
  })
}
