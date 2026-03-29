/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEffect, useRef } from 'react'
import App from '../src/App'

const { exportReportMock } = vi.hoisted(() => ({
  exportReportMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/lib/reporting', () => ({
  exportStatisticalReport: exportReportMock,
}))

afterEach(() => {
  cleanup()
})

vi.mock('../src/components/ResultChart', () => ({
  default: function MockResultChart({
    onChartReady,
  }: {
    onChartReady?: (instance: { getDataURL: () => string }) => void
  }) {
    const initializedRef = useRef(false)

    useEffect(() => {
      if (!initializedRef.current && onChartReady) {
        initializedRef.current = true
        onChartReady({ getDataURL: () => 'data:image/png;base64,mock' })
      }
    }, [onChartReady])

    return <div data-testid="result-chart">mock-chart</div>
  },
}))

describe('App integration flows', () => {
  afterEach(() => {
    exportReportMock.mockClear()
  })

  it('renders the app shell without crashing', () => {
    render(<App />)
    expect(screen.getByText(/statistical test workbench/i)).toBeInTheDocument()
  })

  it('runs chi-square sample flow and renders summary fields', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    const loadButton = screen.getByRole('button', { name: /load chi-square test of independence sample/i })
    await user.click(loadButton)
    
    const recommendationText = await screen.findByText(/two mapped categorical variables detected\./i, {}, { timeout: 5000 })
    expect(recommendationText).toBeInTheDocument()

    const runButton = screen.getByRole('button', { name: /run recommended test/i })
    await user.click(runButton)

    expect(await screen.findByText(/chi-square test of independence results/i, {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getAllByText(/p-value/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/decision/i).length).toBeGreaterThan(0)
  })

  it('runs paired t-test sample flow with recommended selection', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /load paired t-test sample/i }))
    expect(await screen.findByText(/paired design with two numerical repeated measures\./i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /run recommended test/i }))
    expect(await screen.findByText(/paired t-test results/i)).toBeInTheDocument()
    expect(screen.getAllByText(/p-value/i).length).toBeGreaterThan(0)
  })

  it('runs one-way ANOVA sample flow with recommended selection', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /load one-way anova sample/i }))
    expect(await screen.findByText(/three or more groups with one numerical outcome\./i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /run recommended test/i }))
    expect(await screen.findByText(/one-way anova results/i)).toBeInTheDocument()
    expect(screen.getAllByText(/p-value/i).length).toBeGreaterThan(0)
  })

  it('supports manual override flow and runs selected test successfully', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    const loadButton = screen.getByRole('button', { name: /load independent t-test sample/i })
    await user.click(loadButton)

    const studyDesignSelect = screen.getByLabelText(/study design/i)
    await user.selectOptions(studyDesignSelect, 'paired')
    
    const testSelectionSelect = screen.getByLabelText(/test selection/i)
    await user.selectOptions(testSelectionSelect, 'independent-t')

    expect(
      screen.getByText(/manual override is active. ensure your mapped columns match the selected test requirements./i),
    ).toBeInTheDocument()

    const runButton = screen.getByRole('button', { name: /run selected test \(independent t-test\)/i })
    await user.click(runButton)

    expect(await screen.findByText(/independent t-test results/i, {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getAllByText(/p-value/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/decision/i).length).toBeGreaterThan(0)
  })

  it('supports paste flow and chart switching', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    const csv = 'group,score\nA,68\nA,70\nB,80\nB,82'
    await user.clear(screen.getByLabelText(/paste table/i))
    await user.type(screen.getByLabelText(/paste table/i), csv)
    await user.click(screen.getByRole('button', { name: /load pasted table/i }))

    await user.selectOptions(screen.getByLabelText(/group column/i), 'group')
    await user.selectOptions(screen.getByLabelText(/outcome column/i), 'score')
    await user.click(screen.getByRole('button', { name: /run recommended test/i }))

    expect(await screen.findByText(/independent t-test results/i)).toBeInTheDocument()

    const chartSelect = screen.getByLabelText(/choose chart/i)
    await user.selectOptions(chartSelect, 'Mean Comparison')
    expect((chartSelect as HTMLSelectElement).value).toBe('Mean Comparison')
    expect(screen.getByTestId('result-chart')).toBeInTheDocument()
  })

  it('supports csv upload flow and triggers PDF export', async () => {
    const user = userEvent.setup({ delay: null })
    render(<App />)

    const fileInput = screen.getByLabelText(/upload csv \/ xlsx/i)
    const csvFile = new File(['group,score\nA,60\nA,61\nB,72\nB,73'], 'upload.csv', { type: 'text/csv' })
    await user.upload(fileInput, csvFile)

    expect(await screen.findByText(/rows loaded: 4/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/group column/i), 'group')
    await user.selectOptions(screen.getByLabelText(/outcome column/i), 'score')
    await user.click(screen.getByRole('button', { name: /run recommended test/i }))

    expect(await screen.findByText(/independent t-test results/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /download report \(pdf\)/i }))
    expect(exportReportMock).toHaveBeenCalledTimes(1)
  })
})
