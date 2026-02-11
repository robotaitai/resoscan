/**
 * FFT-based linear convolution.
 *
 * Computes the full linear convolution of two real signals using
 * overlap-save or simple zero-pad + multiply-in-frequency-domain.
 *
 * Output length = a.length + b.length - 1 (standard linear convolution).
 */

import { fft, ifft, nextPowerOfTwo, realToComplex } from './fft'

/**
 * Linearly convolve two real signals via FFT.
 *
 * @returns Float32Array of length `a.length + b.length - 1`.
 */
export function convolve(
  a: Float32Array | Float64Array,
  b: Float32Array | Float64Array,
): Float32Array {
  if (a.length === 0 || b.length === 0) {
    return new Float32Array(0)
  }

  const outLen = a.length + b.length - 1
  const N = nextPowerOfTwo(outLen)

  // Zero-pad both signals to N
  const { re: aRe, im: aIm } = realToComplex(a, N)
  const { re: bRe, im: bIm } = realToComplex(b, N)

  // Forward FFT
  fft(aRe, aIm)
  fft(bRe, bIm)

  // Point-wise complex multiply: C = A * B
  const cRe = new Float64Array(N)
  const cIm = new Float64Array(N)

  for (let i = 0; i < N; i++) {
    cRe[i] = aRe[i] * bRe[i] - aIm[i] * bIm[i]
    cIm[i] = aRe[i] * bIm[i] + aIm[i] * bRe[i]
  }

  // Inverse FFT
  ifft(cRe, cIm)

  // Truncate to linear convolution length and convert to Float32
  const result = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    result[i] = cRe[i]
  }

  return result
}
