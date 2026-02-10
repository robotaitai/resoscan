import { linearToDb, dbToLinear } from './analyse'

describe('DSP utilities', () => {
  it('converts linear 1.0 to 0 dB', () => {
    expect(linearToDb(1)).toBeCloseTo(0)
  })

  it('converts linear 0 to -Infinity dB', () => {
    expect(linearToDb(0)).toBe(-Infinity)
  })

  it('converts 0 dB back to linear 1.0', () => {
    expect(dbToLinear(0)).toBeCloseTo(1)
  })

  it('round-trips dB → linear → dB', () => {
    const db = -6
    expect(linearToDb(dbToLinear(db))).toBeCloseTo(db)
  })
})
