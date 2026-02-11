/**
 * In-place radix-2 Cooley–Tukey FFT.
 *
 * All functions operate on split real/imaginary Float64Arrays for precision.
 * Input length must be a power of two.
 *
 * This module is intentionally dependency-free and browser-API-free.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check whether n is a power of two. */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

/** Return the smallest power of two >= n. */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1
  let p = 1
  while (p < n) p <<= 1
  return p
}

/**
 * Zero-pad a real signal to the given length and return split re/im arrays.
 * If `length` is omitted the signal is padded to the next power of two.
 */
export function realToComplex(
  signal: Float32Array | Float64Array,
  length?: number,
): { re: Float64Array; im: Float64Array } {
  const N = length ?? nextPowerOfTwo(signal.length)
  if (!isPowerOfTwo(N)) {
    throw new RangeError(`FFT length must be a power of two, got ${N}`)
  }
  const re = new Float64Array(N)
  const im = new Float64Array(N)
  const copyLen = Math.min(signal.length, N)
  for (let i = 0; i < copyLen; i++) {
    re[i] = signal[i]
  }
  return { re, im }
}

// ---------------------------------------------------------------------------
// Core FFT
// ---------------------------------------------------------------------------

/**
 * In-place radix-2 decimation-in-time FFT.
 *
 * After calling, `re` and `im` contain the DFT coefficients X[k].
 *
 * @param re  Real parts (length must be power of two).
 * @param im  Imaginary parts (same length as re).
 */
export function fft(re: Float64Array, im: Float64Array): void {
  const N = re.length
  if (N !== im.length) {
    throw new RangeError('re and im must have the same length')
  }
  if (!isPowerOfTwo(N)) {
    throw new RangeError(`FFT length must be a power of two, got ${N}`)
  }
  if (N <= 1) return

  // Bit-reversal permutation
  bitReverse(re, im, N)

  // Butterfly passes
  for (let size = 2; size <= N; size *= 2) {
    const halfSize = size / 2
    const angle = (-2 * Math.PI) / size // negative for forward FFT

    // Pre-compute twiddle step
    const wRe = Math.cos(angle)
    const wIm = Math.sin(angle)

    for (let start = 0; start < N; start += size) {
      let twRe = 1
      let twIm = 0

      for (let j = 0; j < halfSize; j++) {
        const even = start + j
        const odd = start + j + halfSize

        // Twiddle * odd element
        const tRe = twRe * re[odd] - twIm * im[odd]
        const tIm = twRe * im[odd] + twIm * re[odd]

        // Butterfly
        re[odd] = re[even] - tRe
        im[odd] = im[even] - tIm
        re[even] += tRe
        im[even] += tIm

        // Advance twiddle factor
        const nextTwRe = twRe * wRe - twIm * wIm
        const nextTwIm = twRe * wIm + twIm * wRe
        twRe = nextTwRe
        twIm = nextTwIm
      }
    }
  }
}

/**
 * In-place inverse FFT (IFFT).
 *
 * After calling, `re` and `im` contain the time-domain samples x[n].
 */
export function ifft(re: Float64Array, im: Float64Array): void {
  const N = re.length

  // Conjugate input
  for (let i = 0; i < N; i++) {
    im[i] = -im[i]
  }

  // Forward FFT
  fft(re, im)

  // Conjugate and scale by 1/N
  const invN = 1 / N
  for (let i = 0; i < N; i++) {
    re[i] *= invN
    im[i] = -im[i] * invN
  }
}

// ---------------------------------------------------------------------------
// Bit-reversal
// ---------------------------------------------------------------------------

function bitReverse(re: Float64Array, im: Float64Array, N: number): void {
  const bits = Math.log2(N)
  for (let i = 0; i < N; i++) {
    const j = reverseBits(i, bits)
    if (j > i) {
      // Swap re
      const tmpRe = re[i]
      re[i] = re[j]
      re[j] = tmpRe
      // Swap im
      const tmpIm = im[i]
      im[i] = im[j]
      im[j] = tmpIm
    }
  }
}

function reverseBits(x: number, bits: number): number {
  let result = 0
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (x & 1)
    x >>= 1
  }
  return result
}
