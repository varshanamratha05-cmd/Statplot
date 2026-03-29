import { mean, quantile } from './statsUtils'
import type { ResultPayload } from './types'

export function buildChartOption(result: ResultPayload, selectedChart: string): Record<string, unknown> {
  if (result.testType === 'chi-square') {
    const chartData = result.chartData as {
      categoriesA: string[]
      categoriesB: string[]
      observed: number[][]
    }

    if (selectedChart === 'Grouped Bar') {
      return {
        tooltip: { trigger: 'axis' },
        legend: { top: 0 },
        xAxis: { type: 'category', data: chartData.categoriesA },
        yAxis: { type: 'value' },
        series: chartData.categoriesB.map((category, index) => ({
          name: category,
          type: 'bar',
          data: chartData.observed.map((row) => row[index]),
        })),
      }
    }

    const heatData: Array<[number, number, number]> = []
    chartData.observed.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        heatData.push([colIndex, rowIndex, value])
      })
    })

    return {
      tooltip: { position: 'top' },
      grid: { height: '65%', top: '10%' },
      xAxis: { type: 'category', data: chartData.categoriesB, splitArea: { show: true } },
      yAxis: { type: 'category', data: chartData.categoriesA, splitArea: { show: true } },
      visualMap: {
        min: 0,
        max: Math.max(...heatData.map((entry) => entry[2]), 1),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '2%',
      },
      series: [
        {
          name: 'Observed Count',
          type: 'heatmap',
          data: heatData,
          label: { show: true },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0, 0, 0, 0.35)' } },
        },
      ],
    }
  }

  if (result.testType === 'independent-t') {
    const chartData = result.chartData as {
      groups: string[]
      values: number[][]
      means: number[]
    }

    if (selectedChart === 'Mean Comparison') {
      return {
        xAxis: { type: 'category', data: chartData.groups },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: chartData.means }],
        tooltip: { trigger: 'axis' },
      }
    }

    if (selectedChart === 'Strip Plot') {
      const scatter = chartData.groups.flatMap((_, groupIndex) =>
        chartData.values[groupIndex].map((value) => [groupIndex, value]),
      )

      return {
        xAxis: { type: 'category', data: chartData.groups },
        yAxis: { type: 'value' },
        tooltip: {},
        series: [
          {
            type: 'scatter',
            data: scatter,
            symbolSize: 10,
          },
        ],
      }
    }

    const boxData = chartData.values.map((values) => {
      const sorted = [...values].sort((a, b) => a - b)
      return [
        sorted[0],
        quantile(sorted, 0.25),
        quantile(sorted, 0.5),
        quantile(sorted, 0.75),
        sorted[sorted.length - 1],
      ]
    })

    return {
      xAxis: { type: 'category', data: chartData.groups },
      yAxis: { type: 'value' },
      tooltip: { trigger: 'item' },
      series: [
        {
          name: 'Boxplot',
          type: 'boxplot',
          data: boxData,
        },
      ],
    }
  }

  if (result.testType === 'paired-t') {
    const chartData = result.chartData as {
      beforeValues: number[]
      afterValues: number[]
      differences: number[]
    }

    if (selectedChart === 'Difference Histogram') {
      const minValue = Math.min(...chartData.differences)
      const maxValue = Math.max(...chartData.differences)
      const bins = 6
      const width = (maxValue - minValue || 1) / bins
      const counts = Array.from({ length: bins }, () => 0)

      chartData.differences.forEach((value) => {
        const idx = Math.min(Math.floor((value - minValue) / width), bins - 1)
        counts[idx] += 1
      })

      const labels = counts.map((_, index) => {
        const start = minValue + index * width
        const end = start + width
        return `${start.toFixed(1)} to ${end.toFixed(1)}`
      })

      return {
        xAxis: { type: 'category', data: labels },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: counts }],
        tooltip: { trigger: 'axis' },
      }
    }

    if (selectedChart === 'Before vs After Means') {
      return {
        xAxis: { type: 'category', data: ['Before', 'After'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [mean(chartData.beforeValues), mean(chartData.afterValues)] }],
      }
    }

    return {
      xAxis: { type: 'category', data: chartData.beforeValues.map((_, index) => `Pair ${index + 1}`) },
      yAxis: { type: 'value' },
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      series: [
        { name: 'Before', type: 'line', data: chartData.beforeValues },
        { name: 'After', type: 'line', data: chartData.afterValues },
      ],
    }
  }

  const chartData = result.chartData as {
    groupNames: string[]
    groups: number[][]
    means: number[]
  }

  if (selectedChart === 'Group Means') {
    return {
      xAxis: { type: 'category', data: chartData.groupNames },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: chartData.means }],
    }
  }

  const boxData = chartData.groups.map((values) => {
    const sorted = [...values].sort((a, b) => a - b)
    return [
      sorted[0],
      quantile(sorted, 0.25),
      quantile(sorted, 0.5),
      quantile(sorted, 0.75),
      sorted[sorted.length - 1],
    ]
  })

  return {
    xAxis: { type: 'category', data: chartData.groupNames },
    yAxis: { type: 'value' },
    series: [{ type: 'boxplot', data: boxData }],
    tooltip: { trigger: 'item' },
  }
}
