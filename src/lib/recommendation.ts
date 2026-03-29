import type { EffectiveColumnTypes, MappingState, RecommendationResult, StudyDesign, TestType } from './types'
import type { DataRow } from './types'

export function recommendTest(
  dataRows: DataRow[],
  columns: string[],
  effectiveColumnTypes: EffectiveColumnTypes,
  mapping: MappingState,
  studyDesign: StudyDesign,
): RecommendationResult {
  if (dataRows.length === 0) {
    return { test: null, reason: 'Load or paste data first.' }
  }

  const categoricalColumns = columns.filter((column) => effectiveColumnTypes[column] === 'categorical')
  const numericalColumns = columns.filter((column) => effectiveColumnTypes[column] === 'numerical')

  if (mapping.varA && mapping.varB) {
    const bothCategorical =
      effectiveColumnTypes[mapping.varA] === 'categorical' && effectiveColumnTypes[mapping.varB] === 'categorical'
    if (bothCategorical) {
      return { test: 'chi-square', reason: 'Two mapped categorical variables detected.' }
    }
  }

  if (mapping.before && mapping.after && studyDesign === 'paired') {
    const bothNumeric =
      effectiveColumnTypes[mapping.before] === 'numerical' && effectiveColumnTypes[mapping.after] === 'numerical'
    if (bothNumeric) {
      return { test: 'paired-t', reason: 'Paired design with two numerical repeated measures.' }
    }
  }

  if (mapping.group && mapping.outcome) {
    const outcomeNumeric = effectiveColumnTypes[mapping.outcome] === 'numerical'
    const groupCategorical = effectiveColumnTypes[mapping.group] === 'categorical'
    const groups = new Set(dataRows.map((row) => row[mapping.group]).filter(Boolean)).size

    if (outcomeNumeric && groupCategorical && studyDesign === 'independent' && groups === 2) {
      return { test: 'independent-t', reason: 'Independent design with two groups and one numerical outcome.' }
    }
    if (outcomeNumeric && groupCategorical && groups >= 3) {
      return { test: 'anova', reason: 'Three or more groups with one numerical outcome.' }
    }
  }

  if (categoricalColumns.length >= 2) {
    return { test: 'chi-square', reason: 'At least two categorical columns available.' }
  }

  if (numericalColumns.length >= 2 && studyDesign === 'paired') {
    return { test: 'paired-t', reason: 'Paired design and at least two numerical columns.' }
  }

  return {
    test: null,
    reason: 'Map your columns to identify the correct test automatically.',
  }
}

export function getChartChoices(testType: TestType): string[] {
  if (testType === 'chi-square') return ['Heatmap', 'Grouped Bar']
  if (testType === 'independent-t') return ['Box Plot', 'Strip Plot', 'Mean Comparison']
  if (testType === 'paired-t') return ['Paired Slope', 'Difference Histogram', 'Before vs After Means']
  return ['Group Box Plot', 'Group Means']
}
