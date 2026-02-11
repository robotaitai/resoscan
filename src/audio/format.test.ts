import {
  formatDeviceLabel,
  formatSampleRate,
  formatProcessingSetting,
  formatDuration,
  bufferDuration,
  summariseSettings,
  deduplicateDevices,
} from './format'

describe('formatDeviceLabel', () => {
  it('returns "Microphone N" for empty labels', () => {
    expect(formatDeviceLabel({ deviceId: 'a', label: '' }, 0)).toBe(
      'Microphone 1',
    )
    expect(formatDeviceLabel({ deviceId: 'b', label: '  ' }, 2)).toBe(
      'Microphone 3',
    )
  })

  it('returns the label when present', () => {
    expect(
      formatDeviceLabel({ deviceId: 'a', label: 'MacBook Pro Microphone' }, 0),
    ).toBe('MacBook Pro Microphone')
  })

  it('truncates labels longer than 60 chars', () => {
    const long = 'A'.repeat(80)
    const result = formatDeviceLabel({ deviceId: 'a', label: long }, 0)
    expect(result.length).toBe(60)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('formatSampleRate', () => {
  it('formats 48000 as "48 kHz"', () => {
    expect(formatSampleRate(48000)).toBe('48 kHz')
  })

  it('formats 44100 as "44.1 kHz"', () => {
    expect(formatSampleRate(44100)).toBe('44.1 kHz')
  })

  it('formats 96000 as "96 kHz"', () => {
    expect(formatSampleRate(96000)).toBe('96 kHz')
  })

  it('returns "Unknown" for undefined', () => {
    expect(formatSampleRate(undefined)).toBe('Unknown')
  })

  it('formats sub-1000 rates in Hz', () => {
    expect(formatSampleRate(800)).toBe('800 Hz')
  })
})

describe('formatProcessingSetting', () => {
  it('reports false as not overridden', () => {
    const result = formatProcessingSetting(false)
    expect(result.text).toBe('false')
    expect(result.overridden).toBe(false)
  })

  it('reports true as overridden', () => {
    const result = formatProcessingSetting(true)
    expect(result.text).toContain('override')
    expect(result.overridden).toBe(true)
  })

  it('handles undefined as unknown', () => {
    const result = formatProcessingSetting(undefined)
    expect(result.text).toBe('Unknown')
    expect(result.overridden).toBe(false)
  })
})

describe('summariseSettings', () => {
  it('shows sample rate and channels', () => {
    const summary = summariseSettings({
      sampleRate: 48000,
      channelCount: 1,
    })
    expect(summary).toBe('48 kHz · 1ch')
  })

  it('includes override flags', () => {
    const summary = summariseSettings({
      sampleRate: 48000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: false,
    })
    expect(summary).toContain('overrides: EC')
  })

  it('returns fallback when no details available', () => {
    expect(summariseSettings({})).toBe('No details available')
  })
})

describe('deduplicateDevices', () => {
  it('removes devices with duplicate groupId', () => {
    const devices = [
      { deviceId: '1', label: 'Mic A', groupId: 'g1' },
      { deviceId: '2', label: 'Mic B', groupId: 'g1' },
      { deviceId: '3', label: 'Mic C', groupId: 'g2' },
    ]
    const result = deduplicateDevices(devices)
    expect(result).toHaveLength(2)
    expect(result[0].deviceId).toBe('1')
    expect(result[1].deviceId).toBe('3')
  })

  it('returns empty array for empty input', () => {
    expect(deduplicateDevices([])).toEqual([])
  })
})

describe('formatDuration', () => {
  it('formats sub-second as ms', () => {
    expect(formatDuration(0.123)).toBe('123 ms')
  })

  it('formats 0 as ms', () => {
    expect(formatDuration(0)).toBe('0 ms')
  })

  it('formats 1 second', () => {
    expect(formatDuration(1)).toBe('1.00 s')
  })

  it('formats 2.345 seconds', () => {
    expect(formatDuration(2.345)).toBe('2.35 s')
  })
})

describe('bufferDuration', () => {
  it('computes correct duration', () => {
    expect(bufferDuration(48000, 48000)).toBeCloseTo(1.0)
  })

  it('computes correct duration for 2 seconds at 44100', () => {
    expect(bufferDuration(88200, 44100)).toBeCloseTo(2.0)
  })

  it('returns 0 for 0 sample rate', () => {
    expect(bufferDuration(1000, 0)).toBe(0)
  })

  it('returns 0 for 0 samples', () => {
    expect(bufferDuration(0, 48000)).toBe(0)
  })
})
