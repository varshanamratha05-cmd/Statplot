import type { ResultPayload } from './types'

function formatNumber(value: number, digits = 6): string {
  if (!Number.isFinite(value)) return 'NA'
  return value.toFixed(digits)
}

type ExportReportInput = {
  title: string
  result: ResultPayload
  chartDataUrl?: string
}

export async function exportStatisticalReport(input: ExportReportInput): Promise<void> {
  const { title, result, chartDataUrl } = input

  const [{ default: jsPDFCtor }, { default: autoTableFn }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const pdf = new jsPDFCtor('p', 'mm', 'a4')
  const margin = 10
  const lineHeight = 6
  const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2
  const pageHeight = pdf.internal.pageSize.getHeight()
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage()
      y = margin
    }
  }

  const writeLine = (text: string, fontSize = 11, indent = 0) => {
    pdf.setFontSize(fontSize)
    const wrapped = pdf.splitTextToSize(text, maxWidth - indent)
    wrapped.forEach((line: string) => {
      ensureSpace(lineHeight)
      pdf.text(line, margin + indent, y)
      y += lineHeight
    })
  }

  writeLine(title || 'Statistical Report', 16)
  y += 1
  writeLine(`Test: ${result.testName}`)
  writeLine(`Alpha: ${formatNumber(result.alpha, 3)}`)
  writeLine(`Statistic: ${result.statisticLabel} = ${formatNumber(result.statisticValue, 4)}`)
  writeLine(`Degrees of freedom: ${result.degreesOfFreedom}`)
  writeLine(`p-value: ${formatNumber(result.pValue, 6)}`)
  writeLine(`Decision: ${result.conclusion}`)
  if (result.effectSizeLabel && result.effectSizeValue !== undefined) {
    writeLine(`${result.effectSizeLabel}: ${formatNumber(result.effectSizeValue, 4)}`)
  }

  y += 2
  writeLine('Hypotheses', 13)
  writeLine(`H0: ${result.hypothesisNull}`, 11, 2)
  writeLine(`H1: ${result.hypothesisAlt}`, 11, 2)

  y += 2
  writeLine('Formula-driven Steps', 13)
  result.steps.forEach((step, idx) => writeLine(`${idx + 1}. ${step}`, 11, 2))

  y += 2
  writeLine('Interpretation', 13)
  writeLine(result.interpretation, 11, 2)

  y += 2
  writeLine('Assumptions', 13)
  result.assumptions.forEach((assumption) => writeLine(`- ${assumption}`, 11, 2))

  if (result.warnings.length > 0) {
    y += 2
    writeLine('Warnings', 13)
    result.warnings.forEach((warning) => writeLine(`- ${warning}`, 11, 2))
  }

  if (result.detailedTables && result.detailedTables.length > 0) {
    y += 2
    writeLine('Detailed Tables', 13)
    result.detailedTables.forEach((table) => {
      y += 2
      writeLine(table.title, 12, 2)

      autoTableFn(pdf, {
        startY: y,
        margin: { left: margin + 2, right: margin },
        head: [table.columns],
        body: table.rows.map((row) => row.map((cell) => String(cell))),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [11, 114, 133] },
        theme: 'grid',
      })

      const withAutoTable = pdf as unknown as {
        lastAutoTable?: { finalY: number }
      }
      y = (withAutoTable.lastAutoTable?.finalY ?? y) + 4
    })
  }

  if (chartDataUrl) {
    pdf.addPage()
    y = margin
    writeLine('Chart Snapshot', 13)
    const imageWidth = maxWidth
    const imageHeight = 110
    ensureSpace(imageHeight + 4)
    pdf.addImage(chartDataUrl, 'PNG', margin, y, imageWidth, imageHeight)
  }

  pdf.save(`${(title || 'stat-report').replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
