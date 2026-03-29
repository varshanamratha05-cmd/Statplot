export type ColumnType = 'numerical' | 'categorical'

export function detectColumnType(values: string[]): ColumnType {
  const cleaned = values.filter((value) => value !== '')
  if (cleaned.length === 0) return 'categorical'

  const numericCount = cleaned.filter((value) => Number.isFinite(Number(value))).length
  const numericRatio = numericCount / cleaned.length
  const uniqueCount = new Set(cleaned).size

  if (numericRatio > 0.8 && uniqueCount > Math.min(8, cleaned.length / 2)) {
    return 'numerical'
  }

  return 'categorical'
}

export function toNumeric(values: string[]): number[] {
  return values.map((value) => Number(value)).filter((value) => Number.isFinite(value))
}

export function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function sampleVariance(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const sq = values.reduce((sum, value) => sum + (value - avg) ** 2, 0)
  return sq / (values.length - 1)
}

export function sampleStandardDeviation(values: number[]): number {
  return Math.sqrt(sampleVariance(values))
}

export function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted.length === 0) return Number.NaN
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  }
  return sorted[base]
}
