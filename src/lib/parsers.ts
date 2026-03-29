import Papa from 'papaparse'
import { INITIAL_MAPPING, SAMPLE_DATASETS } from './constants'
import type { MappingState, StudyDesign, TestType } from './types'
import type { DataRow } from './types'

function normalizeRow(row: Record<string, unknown>): DataRow {
  const normalized: DataRow = {}
  Object.keys(row).forEach((key) => {
    normalized[key] = String(row[key] ?? '').trim()
  })
  return normalized
}

export function parseCSVText(csvText: string): DataRow[] {
  const parsed = Papa.parse<DataRow>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  })

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0].message)
  }

  return parsed.data.map((row) => normalizeRow(row))
}

export async function parseTabularFile(file: File): Promise<{ rows: DataRow[]; rawInputText: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv') {
    const text = await file.text()
    return { rows: parseCSVText(text), rawInputText: text }
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const xlsxModule = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const workbook = xlsxModule.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheetName]
    const jsonRows = xlsxModule.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    })

    return {
      rows: jsonRows.map((row) => normalizeRow(row)),
      rawInputText: '',
    }
  }

  throw new Error('Only CSV and XLSX files are supported in v1.')
}

function getSampleDefaults(testType: TestType): { studyDesign: StudyDesign; mapping: MappingState } {
  if (testType === 'chi-square') {
    return {
      studyDesign: 'independent',
      mapping: { ...INITIAL_MAPPING, varA: 'gender', varB: 'preference' },
    }
  }

  if (testType === 'independent-t') {
    return {
      studyDesign: 'independent',
      mapping: { ...INITIAL_MAPPING, group: 'class', outcome: 'score' },
    }
  }

  if (testType === 'paired-t') {
    return {
      studyDesign: 'paired',
      mapping: { ...INITIAL_MAPPING, before: 'before', after: 'after' },
    }
  }

  return {
    studyDesign: 'independent',
    mapping: { ...INITIAL_MAPPING, group: 'method', outcome: 'score' },
  }
}

export function parseSampleDataset(testType: TestType): {
  title: string
  rawInput: string
  rows: DataRow[]
  studyDesign: StudyDesign
  mapping: MappingState
} {
  const sample = SAMPLE_DATASETS[testType]
  const defaults = getSampleDefaults(testType)

  return {
    title: sample.title,
    rawInput: sample.csv,
    rows: parseCSVText(sample.csv),
    studyDesign: defaults.studyDesign,
    mapping: defaults.mapping,
  }
}
