import { jStat } from 'jstat'
import { TEST_LABELS } from './constants'
import { mean, sampleStandardDeviation, sampleVariance, toNumeric } from './statsUtils'
import type { DataRow, MappingState, ResultPayload } from './types'

export function runChiSquare(dataRows: DataRow[], mapping: MappingState, alpha: number): ResultPayload {
  if (!mapping.varA || !mapping.varB) {
    throw new Error('Map two categorical columns for chi-square test.')
  }

  const variableA = dataRows.map((row) => row[mapping.varA]).filter(Boolean)
  const variableB = dataRows.map((row) => row[mapping.varB]).filter(Boolean)

  if (variableA.length !== variableB.length || variableA.length === 0) {
    throw new Error('Chi-square requires matched, non-empty category pairs.')
  }

  const categoriesA = Array.from(new Set(variableA))
  const categoriesB = Array.from(new Set(variableB))

  if (categoriesA.length < 2 || categoriesB.length < 2) {
    throw new Error('Chi-square needs at least two categories in each variable.')
  }

  const matrix = categoriesA.map(() => categoriesB.map(() => 0))
  for (let i = 0; i < variableA.length; i += 1) {
    const rowIndex = categoriesA.indexOf(variableA[i])
    const colIndex = categoriesB.indexOf(variableB[i])
    matrix[rowIndex][colIndex] += 1
  }

  const rowTotals = matrix.map((row) => row.reduce((sum, value) => sum + value, 0))
  const colTotals = categoriesB.map((_, colIndex) => matrix.reduce((sum, row) => sum + row[colIndex], 0))
  const n = rowTotals.reduce((sum, value) => sum + value, 0)

  const expected = matrix.map((row, rowIndex) =>
    row.map((_, colIndex) => (rowTotals[rowIndex] * colTotals[colIndex]) / n),
  )

  let chi2 = 0
  matrix.forEach((row, rowIndex) => {
    row.forEach((observed, colIndex) => {
      const exp = expected[rowIndex][colIndex]
      chi2 += (observed - exp) ** 2 / exp
    })
  })

  const df = (categoriesA.length - 1) * (categoriesB.length - 1)
  const pValue = 1 - jStat.chisquare.cdf(chi2, df)
  const minDim = Math.min(categoriesA.length - 1, categoriesB.length - 1)
  if (minDim <= 0) {
    throw new Error('Chi-square needs at least two categories in each variable.')
  }

  const cramerV = Math.sqrt(chi2 / (n * minDim))
  const lowExpected = expected.flat().filter((value) => value < 5).length
  const sparseRatio = lowExpected / expected.flat().length

  const warnings: string[] = []
  if (sparseRatio > 0.2) {
    warnings.push('More than 20% of expected counts are below 5. Interpret chi-square with caution.')
  }

  const conclusion = pValue < alpha ? 'Reject H0' : 'Fail to reject H0'
  const interpretation =
    pValue < alpha
      ? 'Since p < alpha, there is a significant association between the variables.'
      : 'Since p >= alpha, there is no statistically significant association between the variables.'

  return {
    testType: 'chi-square',
    testName: TEST_LABELS['chi-square'],
    hypothesisNull: `${mapping.varA} and ${mapping.varB} are independent.`,
    hypothesisAlt: `${mapping.varA} and ${mapping.varB} are associated.`,
    statisticLabel: 'Chi-square (χ²)',
    statisticValue: chi2,
    degreesOfFreedom: String(df),
    pValue,
    alpha,
    conclusion,
    interpretation,
    assumptions: [
      'Both variables should be categorical.',
      'Observations should be independent.',
      'Expected cell counts should generally be >= 5.',
    ],
    warnings,
    effectSizeLabel: "Cramer's V",
    effectSizeValue: cramerV,
    steps: [
      `Built a ${categoriesA.length} x ${categoriesB.length} contingency table from mapped columns.`,
      'Calculated expected frequency for each cell using (row total * column total) / grand total.',
      'Summed (Observed - Expected)^2 / Expected across all cells.',
      `Computed p-value from χ² distribution with df = ${df}.`,
    ],
    chartData: {
      categoriesA,
      categoriesB,
      observed: matrix,
    },
    detailedTables: [
      {
        title: 'Observed Contingency Table',
        columns: [mapping.varA, ...categoriesB, 'Row Total'],
        rows: categoriesA.map((categoryA, rowIndex) => [categoryA, ...matrix[rowIndex], rowTotals[rowIndex]]),
      },
      {
        title: 'Expected Frequency Table',
        columns: [mapping.varA, ...categoriesB, 'Row Total'],
        rows: categoriesA.map((categoryA, rowIndex) => [
          categoryA,
          ...expected[rowIndex].map((value) => Number(value.toFixed(3))),
          rowTotals[rowIndex],
        ]),
      },
      {
        title: 'Column Totals',
        columns: [mapping.varB, ...categoriesB, 'Grand Total'],
        rows: [['Totals', ...colTotals, n]],
      },
    ],
  }
}

export function runIndependentT(dataRows: DataRow[], mapping: MappingState, alpha: number): ResultPayload {
  if (!mapping.group || !mapping.outcome) {
    throw new Error('Map one grouping column and one numerical outcome column for independent t-test.')
  }

  const groups = dataRows
    .map((row) => row[mapping.group])
    .filter((value) => value !== '')
  const uniqueGroups = Array.from(new Set(groups))

  if (uniqueGroups.length !== 2) {
    throw new Error('Independent t-test requires exactly two independent groups.')
  }

  const g1Values = toNumeric(
    dataRows.filter((row) => row[mapping.group] === uniqueGroups[0]).map((row) => row[mapping.outcome]),
  )
  const g2Values = toNumeric(
    dataRows.filter((row) => row[mapping.group] === uniqueGroups[1]).map((row) => row[mapping.outcome]),
  )

  if (g1Values.length < 2 || g2Values.length < 2) {
    throw new Error('Each group needs at least two numeric observations for t-test.')
  }

  const m1 = mean(g1Values)
  const m2 = mean(g2Values)
  const v1 = sampleVariance(g1Values)
  const v2 = sampleVariance(g2Values)
  const n1 = g1Values.length
  const n2 = g2Values.length
  const se = Math.sqrt(v1 / n1 + v2 / n2)
  if (se === 0) {
    throw new Error('Independent t-test cannot be computed: both groups have zero variance.')
  }

  const t = (m1 - m2) / se
  const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1))
  if (!Number.isFinite(df) || df <= 0) {
    throw new Error('Independent t-test degrees of freedom are invalid for this data.')
  }

  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df))
  if (!Number.isFinite(pValue)) {
    throw new Error('Independent t-test p-value could not be computed for this data.')
  }

  const pooledSD = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))
  const cohensD = pooledSD === 0 ? 0 : (m1 - m2) / pooledSD
  const warnings: string[] = []

  if (n1 < 20 || n2 < 20) {
    warnings.push('Small sample size detected. Consider checking normality and outliers.')
  }
  if (pooledSD === 0) {
    warnings.push('Pooled standard deviation is zero; Cohen\'s d is reported as 0 by convention.')
  }

  const conclusion = pValue < alpha ? 'Reject H0' : 'Fail to reject H0'
  const interpretation =
    pValue < alpha
      ? 'Since p < alpha, there is a significant difference between the two independent groups.'
      : 'Since p >= alpha, there is no significant difference between the two independent groups.'

  return {
    testType: 'independent-t',
    testName: TEST_LABELS['independent-t'],
    hypothesisNull: 'Mean of group 1 equals mean of group 2.',
    hypothesisAlt: 'Mean of group 1 differs from mean of group 2.',
    statisticLabel: 't-statistic',
    statisticValue: t,
    degreesOfFreedom: df.toFixed(2),
    pValue,
    alpha,
    conclusion,
    interpretation,
    assumptions: [
      'Outcome variable is numerical.',
      'Groups are independent.',
      'Outcome is approximately normal in each group.',
    ],
    warnings,
    effectSizeLabel: "Cohen's d",
    effectSizeValue: cohensD,
    steps: [
      `Split outcome by ${mapping.group} into two groups (${uniqueGroups[0]} and ${uniqueGroups[1]}).`,
      'Computed group means and sample variances.',
      'Calculated Welch t-statistic using difference in means and standard error.',
      'Estimated p-value from t distribution (two-tailed).',
    ],
    chartData: {
      groups: uniqueGroups,
      values: [g1Values, g2Values],
      means: [m1, m2],
    },
    detailedTables: [
      {
        title: 'Group Summary',
        columns: ['Group', 'n', 'Mean', 'Variance', 'SD'],
        rows: [
          [uniqueGroups[0], n1, Number(m1.toFixed(4)), Number(v1.toFixed(4)), Number(Math.sqrt(v1).toFixed(4))],
          [uniqueGroups[1], n2, Number(m2.toFixed(4)), Number(v2.toFixed(4)), Number(Math.sqrt(v2).toFixed(4))],
        ],
      },
    ],
  }
}

export function runPairedT(dataRows: DataRow[], mapping: MappingState, alpha: number): ResultPayload {
  if (!mapping.before || !mapping.after) {
    throw new Error('Map before and after numerical columns for paired t-test.')
  }

  const beforeRaw = dataRows.map((row) => row[mapping.before])
  const afterRaw = dataRows.map((row) => row[mapping.after])

  if (beforeRaw.length !== afterRaw.length) {
    throw new Error('Paired t-test requires equal-length paired columns.')
  }

  const beforeValues: number[] = []
  const afterValues: number[] = []

  for (let i = 0; i < beforeRaw.length; i += 1) {
    const b = Number(beforeRaw[i])
    const a = Number(afterRaw[i])
    if (Number.isFinite(b) && Number.isFinite(a)) {
      beforeValues.push(b)
      afterValues.push(a)
    }
  }

  if (beforeValues.length < 2) {
    throw new Error('Paired t-test needs at least two valid numerical pairs.')
  }

  const differences = afterValues.map((afterValue, index) => afterValue - beforeValues[index])
  const meanDiff = mean(differences)
  const sdDiff = sampleStandardDeviation(differences)
  if (sdDiff === 0) {
    throw new Error('Paired t-test cannot be computed: all pairwise differences are identical.')
  }

  const n = differences.length
  const t = meanDiff / (sdDiff / Math.sqrt(n))
  const df = n - 1
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df))
  if (!Number.isFinite(pValue)) {
    throw new Error('Paired t-test p-value could not be computed for this data.')
  }

  const dz = meanDiff / sdDiff
  const warnings: string[] = []
  if (n < 20) {
    warnings.push('Small paired sample size. Check normality of differences when possible.')
  }

  const conclusion = pValue < alpha ? 'Reject H0' : 'Fail to reject H0'
  const interpretation =
    pValue < alpha
      ? 'Since p < alpha, there is a significant difference between paired measurements.'
      : 'Since p >= alpha, there is no significant paired difference.'

  return {
    testType: 'paired-t',
    testName: TEST_LABELS['paired-t'],
    hypothesisNull: 'Mean difference (after - before) is 0.',
    hypothesisAlt: 'Mean difference (after - before) is not 0.',
    statisticLabel: 't-statistic',
    statisticValue: t,
    degreesOfFreedom: String(df),
    pValue,
    alpha,
    conclusion,
    interpretation,
    assumptions: [
      'Data are paired observations from the same subjects/units.',
      'Differences are approximately normally distributed.',
      'Pairs are independent from each other.',
    ],
    warnings,
    effectSizeLabel: 'Cohen dz',
    effectSizeValue: dz,
    steps: [
      'Computed difference for each pair (after - before).',
      'Calculated mean and standard deviation of differences.',
      `Computed t = mean(diff) / (sd(diff)/sqrt(n)) with df = ${df}.`,
      'Estimated two-tailed p-value from t distribution.',
    ],
    chartData: {
      beforeValues,
      afterValues,
      differences,
    },
    detailedTables: [
      {
        title: 'Paired Differences',
        columns: ['Pair', mapping.before, mapping.after, 'Difference (After-Before)'],
        rows: differences.map((difference, idx) => [
          idx + 1,
          Number(beforeValues[idx].toFixed(4)),
          Number(afterValues[idx].toFixed(4)),
          Number(difference.toFixed(4)),
        ]),
      },
    ],
  }
}

export function runAnova(dataRows: DataRow[], mapping: MappingState, alpha: number): ResultPayload {
  if (!mapping.group || !mapping.outcome) {
    throw new Error('Map one grouping and one numerical outcome column for ANOVA.')
  }

  const groupMap = new Map<string, number[]>()
  dataRows.forEach((row) => {
    const groupName = row[mapping.group]
    const outcome = Number(row[mapping.outcome])
    if (groupName && Number.isFinite(outcome)) {
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, [])
      }
      groupMap.get(groupName)?.push(outcome)
    }
  })

  const groupNames = Array.from(groupMap.keys())
  if (groupNames.length < 3) {
    throw new Error('One-way ANOVA requires at least three groups.')
  }

  const groups = groupNames.map((groupName) => groupMap.get(groupName) ?? [])
  const allValues = groups.flat()
  const grandMean = mean(allValues)

  const ssBetween = groups.reduce((sum, groupValues) => {
    const groupMean = mean(groupValues)
    return sum + groupValues.length * (groupMean - grandMean) ** 2
  }, 0)

  const ssWithin = groups.reduce((sum, groupValues) => {
    const groupMean = mean(groupValues)
    return sum + groupValues.reduce((inner, value) => inner + (value - groupMean) ** 2, 0)
  }, 0)

  const k = groups.length
  const n = allValues.length
  const dfBetween = k - 1
  const dfWithin = n - k
  if (dfWithin <= 0) {
    throw new Error('ANOVA requires more observations than the number of groups.')
  }

  const msBetween = ssBetween / dfBetween
  const msWithin = ssWithin / dfWithin
  if (msWithin === 0) {
    throw new Error('ANOVA cannot be computed: within-group variance is zero.')
  }

  const fStat = msBetween / msWithin
  const pValue = 1 - jStat.centralF.cdf(fStat, dfBetween, dfWithin)
  if (!Number.isFinite(pValue)) {
    throw new Error('ANOVA p-value could not be computed for this data.')
  }

  const etaSquared = ssBetween / (ssBetween + ssWithin)
  const warnings: string[] = []
  if (groups.some((groupValues) => groupValues.length < 3)) {
    warnings.push('One or more groups have very small sample sizes. Interpret ANOVA cautiously.')
  }

  const conclusion = pValue < alpha ? 'Reject H0' : 'Fail to reject H0'
  const interpretation =
    pValue < alpha
      ? 'Since p < alpha, at least one group mean differs significantly from the others.'
      : 'Since p >= alpha, there is no significant evidence that group means differ.'

  return {
    testType: 'anova',
    testName: TEST_LABELS.anova,
    hypothesisNull: 'All group means are equal.',
    hypothesisAlt: 'At least one group mean differs.',
    statisticLabel: 'F-statistic',
    statisticValue: fStat,
    degreesOfFreedom: `${dfBetween}, ${dfWithin}`,
    pValue,
    alpha,
    conclusion,
    interpretation,
    assumptions: [
      'Outcome variable is numerical.',
      'Groups are independent.',
      'Residuals are approximately normal and variances are similar.',
    ],
    warnings,
    effectSizeLabel: 'Eta squared (η²)',
    effectSizeValue: etaSquared,
    steps: [
      'Calculated group means and grand mean.',
      'Computed between-group and within-group sums of squares.',
      'Calculated F = MS_between / MS_within.',
      `Estimated p-value from F distribution with df = (${dfBetween}, ${dfWithin}).`,
    ],
    chartData: {
      groupNames,
      groups,
      means: groups.map((groupValues) => mean(groupValues)),
    },
    detailedTables: [
      {
        title: 'Group Summary',
        columns: ['Group', 'n', 'Mean', 'Variance'],
        rows: groupNames.map((groupName, idx) => [
          groupName,
          groups[idx].length,
          Number(mean(groups[idx]).toFixed(4)),
          Number(sampleVariance(groups[idx]).toFixed(4)),
        ]),
      },
      {
        title: 'ANOVA Table',
        columns: ['Source', 'SS', 'df', 'MS', 'F', 'p-value'],
        rows: [
          [
            'Between Groups',
            Number(ssBetween.toFixed(4)),
            dfBetween,
            Number(msBetween.toFixed(4)),
            Number(fStat.toFixed(4)),
            Number(pValue.toFixed(6)),
          ],
          ['Within Groups', Number(ssWithin.toFixed(4)), dfWithin, Number(msWithin.toFixed(4)), '-', '-'],
          ['Total', Number((ssBetween + ssWithin).toFixed(4)), dfBetween + dfWithin, '-', '-', '-'],
        ],
      },
    ],
  }
}
