import { convolve } from './convolve'

describe('convolve', () => {
  it('returns empty for empty inputs', () => {
    expect(convolve(new Float32Array(0), new Float32Array(0))).toEqual(
      new Float32Array(0),
    )
    expect(convolve(new Float32Array([1]), new Float32Array(0))).toEqual(
      new Float32Array(0),
    )
    expect(convolve(new Float32Array(0), new Float32Array([1]))).toEqual(
      new Float32Array(0),
    )
  })

  it('output length = a.length + b.length - 1', () => {
    const a = new Float32Array([1, 2, 3])
    const b = new Float32Array([4, 5])
    const result = convolve(a, b)
    expect(result.length).toBe(4) // 3 + 2 - 1
  })

  it('convolving with a delta [1,0,0,...] returns the other signal', () => {
    const signal = new Float32Array([1, 2, 3, 4])
    const delta = new Float32Array([1, 0, 0, 0])
    const result = convolve(signal, delta)
    // Result is padded to length 7 (4+4-1), first 4 should match signal
    for (let i = 0; i < signal.length; i++) {
      expect(result[i]).toBeCloseTo(signal[i], 4)
    }
    // Tail should be ~0
    for (let i = signal.length; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(0, 4)
    }
  })

  it('convolving [1,1] with [1,1] gives [1,2,1]', () => {
    const a = new Float32Array([1, 1])
    const b = new Float32Array([1, 1])
    const result = convolve(a, b)
    expect(result.length).toBe(3)
    expect(result[0]).toBeCloseTo(1)
    expect(result[1]).toBeCloseTo(2)
    expect(result[2]).toBeCloseTo(1)
  })

  it('known convolution: [1,2,3] * [4,5] = [4,13,22,15]', () => {
    const a = new Float32Array([1, 2, 3])
    const b = new Float32Array([4, 5])
    const result = convolve(a, b)
    const expected = [4, 13, 22, 15]
    expect(result.length).toBe(expected.length)
    for (let i = 0; i < expected.length; i++) {
      expect(result[i]).toBeCloseTo(expected[i], 3)
    }
  })

  it('is commutative: convolve(a,b) ≈ convolve(b,a)', () => {
    const a = new Float32Array([1, -1, 0.5, 0.3])
    const b = new Float32Array([0.5, 1, 0.5])
    const ab = convolve(a, b)
    const ba = convolve(b, a)
    expect(ab.length).toBe(ba.length)
    for (let i = 0; i < ab.length; i++) {
      expect(ab[i]).toBeCloseTo(ba[i], 6)
    }
  })

  it('handles large signals without NaN', () => {
    const N = 4096
    const a = new Float32Array(N)
    const b = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      a[i] = Math.sin((2 * Math.PI * 100 * i) / N)
      b[i] = i < 100 ? 1 / 100 : 0
    }
    const result = convolve(a, b)
    expect(result.length).toBe(2 * N - 1)
    for (let i = 0; i < result.length; i++) {
      expect(Number.isNaN(result[i])).toBe(false)
    }
  })
})
