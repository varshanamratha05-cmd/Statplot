import type { ColumnType } from './statsUtils'

export type StudyDesign = 'independent' | 'paired'
export type TestType = 'chi-square' | 'independent-t' | 'paired-t' | 'anova'

export type DataRow = Record<string, string>

export type MappingState = {
  varA: string
  varB: string
  group: string
  outcome: string
  before: string
  after: string
}

export type RecommendationResult = {
  test: TestType | null
  reason: string
}

export type DetailedTable = {
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

export type ResultPayload = {
  testType: TestType
  testName: string
  hypothesisNull: string
  hypothesisAlt: string
  statisticLabel: string
  statisticValue: number
  degreesOfFreedom: string
  pValue: number
  alpha: number
  conclusion: string
  interpretation: string
  assumptions: string[]
  warnings: string[]
  effectSizeLabel?: string
  effectSizeValue?: number
  steps: string[]
  chartData: Record<string, unknown>
  detailedTables?: DetailedTable[]
}

export type EffectiveColumnTypes = Record<string, ColumnType>
