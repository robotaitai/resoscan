import type { AudioTrackSettings, MicDevice } from './types'

/**
 * Format a device label for display.
 * Browsers return empty strings before permission is granted,
 * and sometimes return very long technical labels.
 */
export function formatDeviceLabel(
  device: Pick<MicDevice, 'deviceId' | 'label'>,
  index: number,
): string {
  if (!device.label || device.label.trim() === '') {
    return `Microphone ${index + 1}`
  }
  // Truncate very long labels
  const label = device.label.trim()
  return label.length > 60 ? label.slice(0, 59) + '…' : label
}

/**
 * Format sample rate for display (e.g. "48,000 Hz" or "48 kHz").
 */
export function formatSampleRate(rate: number | undefined): string {
  if (rate == null) return 'Unknown'
  if (rate >= 1000) {
    const kHz = rate / 1000
    // Show integer kHz when exact, otherwise one decimal
    return Number.isInteger(kHz) ? `${kHz} kHz` : `${kHz.toFixed(1)} kHz`
  }
  return `${rate} Hz`
}

/**
 * Describe an audio processing boolean setting with override warning.
 */
export function formatBooleanSetting(
  _requested: false,
  actual: boolean | undefined,
): { text: string; overridden: boolean } {
  if (actual == null) {
    return { text: 'Unknown', overridden: false }
  }
  if (actual === true) {
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
