import { describe, expect, it } from 'vitest'
import { detectColumnType, mean, quantile, sampleVariance, toNumeric } from '../src/lib/statsUtils'

describe('statsUtils', () => {
  it('detects numerical columns when mostly numeric and high-cardinality', () => {
    const values = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19']
    expect(detectColumnType(values)).toBe('numerical')
  })

  it('detects categorical columns when labels are repeated', () => {
    const values = ['A', 'B', 'A', 'B', 'A', 'C']
    expect(detectColumnType(values)).toBe('categorical')
  })

  it('converts only finite numeric values', () => {
    expect(toNumeric(['1', '2.5', 'x', 'Infinity', '3'])).toEqual([1, 2.5, 3])
  })

  it('computes mean and sample variance', () => {
    const values = [2, 4, 6, 8]
    expect(mean(values)).toBe(5)
    expect(sampleVariance(values)).toBeCloseTo(6.6666667, 6)
  })

  it('computes quantiles', () => {
    const values = [1, 2, 3, 4, 5]
    expect(quantile(values, 0.5)).toBe(3)
    expect(quantile(values, 0.25)).toBe(2)
  })
})
