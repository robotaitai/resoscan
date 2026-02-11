/**
 * AudioWorklet processor that captures raw PCM samples and posts
 * them to the main thread as Float32Array chunks.
 *
 * Messages from main thread:
 *   { type: 'start' }  — begin capturing
 *   { type: 'stop' }   — stop capturing
 *
 * Messages to main thread:
 *   { type: 'chunk', buffer: Float32Array }  — a captured chunk
 *   { type: 'stopped' }                      — acknowledges stop
 */
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._recording = false

    this.port.onmessage = (event) => {
      if (event.data.type === 'start') {
        this._recording = true
      } else if (event.data.type === 'stop') {
        this._recording = false
        this.port.postMessage({ type: 'stopped' })
      }
    }
  }

  process(inputs) {
    if (!this._recording) return true

    const input = inputs[0]
    if (input && input.length > 0) {
      // Copy channel 0 (mono) — we only need one channel for measurement
      const channelData = input[0]
      // Must copy because the buffer is reused by the audio thread
      const copy = new Float32Array(channelData.length)
      copy.set(channelData)
      this.port.postMessage({ type: 'chunk', buffer: copy })
    }

    return true
  }
}

registerProcessor('recorder-processor', RecorderProcessor)
