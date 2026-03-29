import { lazy, Suspense, useMemo, useState } from 'react'
import './App.css'
import {
  detectColumnType,
  type ColumnType,
} from './lib/statsUtils'
import { INITIAL_MAPPING, SAMPLE_DATASETS, TEST_LABELS } from './lib/constants'
import { getChartChoices, recommendTest } from './lib/recommendation'
import { runAnova, runChiSquare, runIndependentT, runPairedT } from './lib/statisticalEngines'
import type { DataRow, MappingState, ResultPayload, StudyDesign, TestType } from './lib/types'
import { buildChartOption } from './lib/chartOptions'
import { parseCSVText, parseSampleDataset, parseTabularFile } from './lib/parsers'
import { exportStatisticalReport } from './lib/reporting'

const LazyECharts = lazy(() => import('./components/ResultChart'))

function App() {
  const [title, setTitle] = useState('Statistical Test Study')
  const [alpha, setAlpha] = useState(0.05)
  const [studyDesign, setStudyDesign] = useState<StudyDesign>('independent')
  const [rawInput, setRawInput] = useState('')
  const [dataRows, setDataRows] = useState<DataRow[]>([])
  const [mapping, setMapping] = useState<MappingState>(INITIAL_MAPPING)
  const [result, setResult] = useState<ResultPayload | null>(null)
  const [manualTest, setManualTest] = useState<'auto' | TestType>('auto')
  const [selectedChart, setSelectedChart] = useState('default')
  const [error, setError] = useState('')
  const [loadingReport, setLoadingReport] = useState(false)
  const [chartInstance, setChartInstance] = useState<null | { getDataURL: (opts: Record<string, unknown>) => string }>(
    null,
  )

  const columns = useMemo(() => {
    if (dataRows.length === 0) return []
    return Object.keys(dataRows[0])
  }, [dataRows])

  const inferredColumnTypes = useMemo(() => {
    const typed: Record<string, ColumnType> = {}
    columns.forEach((column) => {
      const values = dataRows.map((row) => row[column] ?? '')
      typed[column] = detectColumnType(values)
    })
    return typed
  }, [columns, dataRows])

  const [typeOverride, setTypeOverride] = useState<Record<string, ColumnType>>({})

  const effectiveColumnTypes = useMemo(() => {
    const merged: Record<string, ColumnType> = {}
    columns.forEach((column) => {
      merged[column] = typeOverride[column] ?? inferredColumnTypes[column] ?? 'categorical'
    })
    return merged
  }, [columns, typeOverride, inferredColumnTypes])

  const recommendation = useMemo(
    () => recommendTest(dataRows, columns, effectiveColumnTypes, mapping, studyDesign),
    [columns, dataRows, effectiveColumnTypes, mapping, studyDesign],
  )

  const chartChoices = useMemo(() => {
    if (!result) return []
    return getChartChoices(result.testType)
  }, [result])

  const overrideWarning = useMemo(() => {
    if (manualTest === 'auto') return ''
    if (!recommendation.test) {
      return 'Manual override is active. Ensure your mapped columns match the selected test requirements.'
    }
    if (manualTest !== recommendation.test) {
      return `Manual override selected: ${TEST_LABELS[manualTest]}. Recommended test is ${TEST_LABELS[recommendation.test]}.`
    }
    return ''
  }, [manualTest, recommendation.test])

  const handleSampleLoad = (testType: TestType) => {
    const sample = parseSampleDataset(testType)
    setTitle(sample.title)
    setRawInput(sample.rawInput)
    setDataRows(sample.rows)
    setStudyDesign(sample.studyDesign)
    setMapping(sample.mapping)
    setTypeOverride({})
    setResult(null)
    setManualTest('auto')
    setError('')
    setSelectedChart('default')
  }

  const handlePasteLoad = () => {
    try {
      const rows = parseCSVText(rawInput)
      setDataRows(rows)
      setTypeOverride({})
      setResult(null)
      setManualTest('auto')
      setError('')
      setSelectedChart('default')
    } catch (loadError) {
      setError(`Unable to parse pasted data: ${(loadError as Error).message}`)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const { rows, rawInputText } = await parseTabularFile(file)
      setRawInput(rawInputText)

      if (rows.length === 0) {
        throw new Error('No data rows found in uploaded file.')
      }

      setDataRows(rows)
      setTypeOverride({})
      setResult(null)
      setManualTest('auto')
      setError('')
      setSelectedChart('default')
    } catch (uploadError) {
      setError(`Upload failed: ${(uploadError as Error).message}`)
    }
  }

  const handleOverrideType = (column: string, type: ColumnType) => {
    setTypeOverride((previous) => ({ ...previous, [column]: type }))
    setResult(null)
  }

  const runTest = () => {
    setError('')
    setResult(null)

    try {
      if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
        throw new Error('Significance level alpha must be between 0 and 1.')
      }
      const testToRun = manualTest === 'auto' ? recommendation.test : manualTest

      if (!testToRun) {
        throw new Error('Unable to recommend a valid test. Check mapping and column types.')
      }

      let output: ResultPayload
  if (testToRun === 'chi-square') output = runChiSquare(dataRows, mapping, alpha)
  else if (testToRun === 'independent-t') output = runIndependentT(dataRows, mapping, alpha)
  else if (testToRun === 'paired-t') output = runPairedT(dataRows, mapping, alpha)
  else output = runAnova(dataRows, mapping, alpha)

      setResult(output)
      setSelectedChart(getChartChoices(output.testType)[0] ?? 'default')
    } catch (runError) {
      setError((runError as Error).message)
    }
  }

  const chartOption = useMemo(() => {
    if (!result) return null
    return buildChartOption(result, selectedChart)
  }, [result, selectedChart])

  const downloadReport = async () => {
    if (!result) return

    setLoadingReport(true)
    try {
      const chartDataUrl = chartInstance
        ? chartInstance.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' })
        : undefined

      await exportStatisticalReport({
        title,
        result,
        chartDataUrl,
      })

    } finally {
      setLoadingReport(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Statistical Test Workbench</p>
        <h1>Chi-square, Independent t-test, Paired t-test, and One-way ANOVA</h1>
        <p className="subtitle">
          Upload CSV/XLSX or paste a table, map variables, detect data type, run formula-based calculations, and export a
          report.
        </p>
      </header>

      <section className="panel grid two">
        <label>
          Study Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter title" />
        </label>
        <label>
          Significance Level (alpha)
          <input
            type="number"
            min="0.001"
            max="0.2"
            step="0.001"
            value={alpha}
            onChange={(event) => setAlpha(Number(event.target.value))}
          />
        </label>
        <label>
          Study Design
          <select value={studyDesign} onChange={(event) => setStudyDesign(event.target.value as StudyDesign)}>
            <option value="independent">Independent groups</option>
            <option value="paired">Paired / repeated measures</option>
          </select>
        </label>
        <label>
          Test Selection
          <select value={manualTest} onChange={(event) => setManualTest(event.target.value as 'auto' | TestType)}>
            <option value="auto">Auto (recommended)</option>
            <option value="chi-square">Chi-square Test of Independence</option>
            <option value="independent-t">Independent t-test</option>
            <option value="paired-t">Paired t-test</option>
            <option value="anova">One-way ANOVA</option>
          </select>
        </label>
        <div className="recommendation">
          <p>Recommended test</p>
          <h3>{recommendation.test ? TEST_LABELS[recommendation.test] : 'Not determined yet'}</h3>
          <small>{recommendation.reason}</small>
        </div>
      </section>

      {overrideWarning && (
        <section className="panel override-warning">
          <p>{overrideWarning}</p>
        </section>
      )}

      <section className="panel">
        <h2>Load Data</h2>
        <div className="action-row sample-row">
          {(Object.keys(SAMPLE_DATASETS) as TestType[]).map((sampleType) => (
            <button key={sampleType} onClick={() => handleSampleLoad(sampleType)}>
              Load {TEST_LABELS[sampleType]} Sample
            </button>
          ))}
        </div>
        <div className="grid two">
          <label>
            Paste Table (CSV format with header)
            <textarea
              rows={9}
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              placeholder="group,score&#10;A,10&#10;A,11&#10;B,15"
            />
          </label>
          <div className="upload-card">
            <label>
              Upload CSV / XLSX
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
            </label>
            <button onClick={handlePasteLoad}>Load Pasted Table</button>
            <p>Rows loaded: {dataRows.length}</p>
            <p>Columns: {columns.join(', ') || 'None'}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Column Types and Mapping</h2>
        <div className="grid three">
          {columns.map((column) => (
            <label key={column}>
              {column}
              <select
                value={effectiveColumnTypes[column]}
                onChange={(event) => handleOverrideType(column, event.target.value as ColumnType)}
              >
                <option value="categorical">Categorical</option>
                <option value="numerical">Numerical</option>
              </select>
            </label>
          ))}
        </div>

        <div className="grid three mapping-grid">
          <label>
            Variable A (categorical)
            <select value={mapping.varA} onChange={(event) => setMapping((prev) => ({ ...prev, varA: event.target.value }))}>
              <option value="">Select column</option>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>
          <label>
            Variable B (categorical)
            <select value={mapping.varB} onChange={(event) => setMapping((prev) => ({ ...prev, varB: event.target.value }))}>
              <option value="">Select column</option>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>
          <label>
            Group Column
            <select value={mapping.group} onChange={(event) => setMapping((prev) => ({ ...prev, group: event.target.value }))}>
              <option value="">Select column</option>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>
          <label>
            Outcome Column
            <select
              value={mapping.outcome}
              onChange={(event) => setMapping((prev) => ({ ...prev, outcome: event.target.value }))}
            >
              <option value="">Select column</option>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>
          <label>
            Before Column
            <select value={mapping.before} onChange={(event) => setMapping((prev) => ({ ...prev, before: event.target.value }))}>
              <option value="">Select column</option>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>
          <label>
            After Column
            <select value={mapping.after} onChange={(event) => setMapping((prev) => ({ ...prev, after: event.target.value }))}>
              <option value="">Select column</option>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="action-row">
          <button className="run-button" onClick={runTest}>
            {manualTest === 'auto' ? 'Run Recommended Test' : `Run Selected Test (${TEST_LABELS[manualTest]})`}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </section>

      {result && (
        <section className="panel">
          <h2>{result.testName} Results</h2>
          <div className="result-grid">
            <div>
              <h3>Hypotheses</h3>
              <p>
                <strong>H0:</strong> {result.hypothesisNull}
              </p>
              <p>
                <strong>H1:</strong> {result.hypothesisAlt}
              </p>
              <h3>Summary</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Statistic</td>
                    <td>
                      {result.statisticLabel} = {result.statisticValue.toFixed(4)}
                    </td>
                  </tr>
                  <tr>
                    <td>Degrees of Freedom</td>
                    <td>{result.degreesOfFreedom}</td>
                  </tr>
                  <tr>
                    <td>p-value</td>
                    <td>{result.pValue.toFixed(6)}</td>
                  </tr>
                  <tr>
                    <td>Decision</td>
                    <td>{result.conclusion}</td>
                  </tr>
                  {result.effectSizeLabel && result.effectSizeValue !== undefined && (
                    <tr>
                      <td>{result.effectSizeLabel}</td>
                      <td>{result.effectSizeValue.toFixed(4)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h3>Formula-driven Steps</h3>
              <ol>
                {result.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <h3>Inference for Students</h3>
              <p>{result.interpretation}</p>

              <h3>Assumption Notes</h3>
              <ul>
                {result.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              {result.warnings.length > 0 && (
                <>
                  <h3>Warnings</h3>
                  <ul className="warning-list">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="chart-section">
            {result.detailedTables && result.detailedTables.length > 0 && (
              <div className="detail-section">
                <h3>Detailed Calculation Tables</h3>
                {result.detailedTables.map((table) => (
                  <div className="detail-table" key={table.title}>
                    <h4>{table.title}</h4>
                    <table>
                      <thead>
                        <tr>
                          {table.columns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, rowIndex) => (
                          <tr key={`${table.title}-${rowIndex}`}>
                            {row.map((cell, cellIndex) => (
                              <td key={`${table.title}-${rowIndex}-${cellIndex}`}>{String(cell)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            <div className="chart-controls">
              <label>
                Choose chart
                <select value={selectedChart} onChange={(event) => setSelectedChart(event.target.value)}>
                  {chartChoices.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={downloadReport} disabled={loadingReport}>
                {loadingReport ? 'Preparing PDF...' : 'Download Report (PDF)'}
              </button>
            </div>

            {chartOption && (
              <Suspense fallback={<p>Loading chart...</p>}>
                <LazyECharts
                  onChartReady={(instance) =>
                    setChartInstance(instance as { getDataURL: (opts: Record<string, unknown>) => string })
                  }
                  option={chartOption}
                  style={{ height: 380, width: '100%' }}
                />
              </Suspense>
            )}
          </div>
        </section>
      )}
    </main>
  )
}

export default App
