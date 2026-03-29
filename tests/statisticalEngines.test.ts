import { describe, expect, it } from 'vitest'
import { runAnova, runChiSquare, runIndependentT, runPairedT } from '../src/lib/statisticalEngines'
import type { DataRow, MappingState } from '../src/lib/types'

const alpha = 0.05

describe('statisticalEngines', () => {
  it('runs chi-square and returns a valid p-value', () => {
    const rows: DataRow[] = [
      { gender: 'Male', pref: 'A' },
      { gender: 'Male', pref: 'A' },
      { gender: 'Male', pref: 'B' },
      { gender: 'Female', pref: 'B' },
      { gender: 'Female', pref: 'B' },
      { gender: 'Female', pref: 'A' },
    ]

    const mapping: MappingState = {
      varA: 'gender',
      varB: 'pref',
      group: '',
      outcome: '',
      before: '',
      after: '',
    }

    const result = runChiSquare(rows, mapping, alpha)
    expect(result.testType).toBe('chi-square')
    expect(result.pValue).toBeGreaterThanOrEqual(0)
    expect(result.pValue).toBeLessThanOrEqual(1)
  })

  it('runs independent t-test and detects mean difference', () => {
    const rows: DataRow[] = [
      { grp: 'A', score: '10' },
      { grp: 'A', score: '11' },
      { grp: 'A', score: '12' },
      { grp: 'B', score: '20' },
      { grp: 'B', score: '21' },
      { grp: 'B', score: '22' },
    ]

    const mapping: MappingState = {
      varA: '',
      varB: '',
      group: 'grp',
      outcome: 'score',
      before: '',
      after: '',
    }

    const result = runIndependentT(rows, mapping, alpha)
    expect(result.testType).toBe('independent-t')
    expect(result.pValue).toBeLessThan(alpha)
  })

  it('runs paired t-test and detects paired change', () => {
    const rows: DataRow[] = [
      { before: '10', after: '12' },
      { before: '11', after: '14' },
      { before: '12', after: '16' },
      { before: '13', after: '16' },
    ]

    const mapping: MappingState = {
      varA: '',
      varB: '',
      group: '',
      outcome: '',
      before: 'before',
      after: 'after',
    }

    const result = runPairedT(rows, mapping, alpha)
    expect(result.testType).toBe('paired-t')
    expect(result.pValue).toBeLessThan(alpha)
  })

  it('runs one-way ANOVA and reports finite output', () => {
    const rows: DataRow[] = [
      { method: 'A', score: '10' },
      { method: 'A', score: '11' },
      { method: 'A', score: '12' },
      { method: 'B', score: '20' },
      { method: 'B', score: '21' },
      { method: 'B', score: '22' },
      { method: 'C', score: '30' },
      { method: 'C', score: '31' },
      { method: 'C', score: '32' },
    ]

    const mapping: MappingState = {
      varA: '',
      varB: '',
      group: 'method',
      outcome: 'score',
      before: '',
      after: '',
    }

    const result = runAnova(rows, mapping, alpha)
    expect(result.testType).toBe('anova')
    expect(Number.isFinite(result.statisticValue)).toBe(true)
    expect(result.pValue).toBeGreaterThanOrEqual(0)
    expect(result.pValue).toBeLessThanOrEqual(1)
  })
})
