import { fft, ifft, isPowerOfTwo, nextPowerOfTwo, realToComplex } from './fft'

// ---------------------------------------------------------------------------
// isPowerOfTwo
// ---------------------------------------------------------------------------

describe('isPowerOfTwo', () => {
  it('returns true for powers of two', () => {
    expect(isPowerOfTwo(1)).toBe(true)
    expect(isPowerOfTwo(2)).toBe(true)
    expect(isPowerOfTwo(4)).toBe(true)
    expect(isPowerOfTwo(1024)).toBe(true)
    expect(isPowerOfTwo(65536)).toBe(true)
  })

  it('returns false for non-powers of two', () => {
    expect(isPowerOfTwo(0)).toBe(false)
    expect(isPowerOfTwo(3)).toBe(false)
    expect(isPowerOfTwo(5)).toBe(false)
    expect(isPowerOfTwo(100)).toBe(false)
    expect(isPowerOfTwo(-4)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// nextPowerOfTwo
// ---------------------------------------------------------------------------

describe('nextPowerOfTwo', () => {
  it('returns 1 for 0 or 1', () => {
    expect(nextPowerOfTwo(0)).toBe(1)
    expect(nextPowerOfTwo(1)).toBe(1)
  })

  it('returns the value if already a power of two', () => {
    expect(nextPowerOfTwo(2)).toBe(2)
    expect(nextPowerOfTwo(16)).toBe(16)
  })

  it('rounds up to the next power of two', () => {
    expect(nextPowerOfTwo(3)).toBe(4)
    expect(nextPowerOfTwo(5)).toBe(8)
    expect(nextPowerOfTwo(100)).toBe(128)
    expect(nextPowerOfTwo(1000)).toBe(1024)
  })
})

// ---------------------------------------------------------------------------
// realToComplex
// ---------------------------------------------------------------------------

describe('realToComplex', () => {
  it('pads to the next power of two by default', () => {
    const signal = new Float32Array([1, 2, 3])
    const { re, im } = realToComplex(signal)
    expect(re.length).toBe(4)
    expect(im.length).toBe(4)
    expect(re[0]).toBe(1)
    expect(re[1]).toBe(2)
    expect(re[2]).toBe(3)
    expect(re[3]).toBe(0)
    expect(im[0]).toBe(0)
  })

  it('pads to the specified length', () => {
    const signal = new Float32Array([1, 2])
    const { re } = realToComplex(signal, 8)
    expect(re.length).toBe(8)
    expect(re[0]).toBe(1)
    expect(re[1]).toBe(2)
    expect(re[7]).toBe(0)
  })

  it('throws if the specified length is not a power of two', () => {
    expect(() => realToComplex(new Float32Array([1]), 3)).toThrow(RangeError)
  })
})

// ---------------------------------------------------------------------------
// fft / ifft
// ---------------------------------------------------------------------------

describe('fft', () => {
  it('handles length-1 (no-op)', () => {
    const re = new Float64Array([42])
    const im = new Float64Array([0])
    fft(re, im)
    expect(re[0]).toBe(42)
    expect(im[0]).toBe(0)
  })

  it('correctly transforms a length-2 signal', () => {
    // DFT of [1, 1]: X[0]=2, X[1]=0
    const re = new Float64Array([1, 1])
    const im = new Float64Array([0, 0])
    fft(re, im)
    expect(re[0]).toBeCloseTo(2)
    expect(re[1]).toBeCloseTo(0)
  })

  it('correctly transforms a length-4 DC signal', () => {
    // DFT of [1,1,1,1]: X[0]=4, X[1..3]=0
    const re = new Float64Array([1, 1, 1, 1])
    const im = new Float64Array([0, 0, 0, 0])
    fft(re, im)
    expect(re[0]).toBeCloseTo(4)
    expect(re[1]).toBeCloseTo(0)
    expect(re[2]).toBeCloseTo(0)
    expect(re[3]).toBeCloseTo(0)
  })

  it('correctly transforms a known signal [1,0,0,0]', () => {
    // DFT of delta: all ones
    const re = new Float64Array([1, 0, 0, 0])
    const im = new Float64Array([0, 0, 0, 0])
    fft(re, im)
    for (let i = 0; i < 4; i++) {
      expect(re[i]).toBeCloseTo(1)
      expect(im[i]).toBeCloseTo(0)
    }
  })

  it('satisfies Parseval theorem (energy conservation)', () => {
    // Sum of |x[n]|^2 = (1/N) * Sum of |X[k]|^2
    const N = 64
    const re = new Float64Array(N)
    const im = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      re[i] =
        Math.sin((2 * Math.PI * 7 * i) / N) +
        0.5 * Math.cos((2 * Math.PI * 13 * i) / N)
    }

    // Time-domain energy
    let timeEnergy = 0
    for (let i = 0; i < N; i++) {
      timeEnergy += re[i] * re[i]
    }

    fft(re, im)

    // Frequency-domain energy
    let freqEnergy = 0
    for (let i = 0; i < N; i++) {
      freqEnergy += re[i] * re[i] + im[i] * im[i]
    }
    freqEnergy /= N

    expect(freqEnergy).toBeCloseTo(timeEnergy, 6)
  })

  it('throws for non-power-of-two length', () => {
    const re = new Float64Array(3)
    const im = new Float64Array(3)
    expect(() => fft(re, im)).toThrow(RangeError)
  })

  it('throws for mismatched re/im lengths', () => {
    const re = new Float64Array(4)
    const im = new Float64Array(8)
    expect(() => fft(re, im)).toThrow(RangeError)
  })
})

describe('ifft', () => {
  it('round-trips a known signal', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const N = original.length
    const re = new Float64Array(original)
    const im = new Float64Array(N)

    fft(re, im)
    ifft(re, im)

    for (let i = 0; i < N; i++) {
      expect(re[i]).toBeCloseTo(original[i], 10)
      expect(im[i]).toBeCloseTo(0, 10)
    }
  })

  it('round-trips a sine wave', () => {
    const N = 256
    const original = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      original[i] = Math.sin((2 * Math.PI * 10 * i) / N)
    }
    const re = new Float64Array(original)
    const im = new Float64Array(N)

    fft(re, im)
    ifft(re, im)

    for (let i = 0; i < N; i++) {
      expect(re[i]).toBeCloseTo(original[i], 8)
    }
  })

  it('round-trips random data', () => {
    const N = 128
    const original = new Float64Array(N)
    // Deterministic pseudo-random
    let seed = 42
    for (let i = 0; i < N; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      original[i] = (seed / 0x7fffffff) * 2 - 1
    }
    const re = new Float64Array(original)
    const im = new Float64Array(N)

    fft(re, im)
    ifft(re, im)

    for (let i = 0; i < N; i++) {
      expect(re[i]).toBeCloseTo(original[i], 8)
    }
  })
})
