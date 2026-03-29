# Statistical Test Workbench

A React + TypeScript web app for selecting and running common assignment-focused statistical tests with transparent, formula-driven steps and chart outputs.

## Supported Tests

- Chi-square test of independence
- Independent t-test
- Paired t-test
- One-way ANOVA

## Core Features

- Study title, significance level, and study design input
- CSV/XLSX upload and pasted CSV table input
- Column type detection (numerical/categorical) with manual override
- Column mapping workflow for variable roles
- Test recommendation engine plus manual test selector override
- Formula-driven results with hypotheses, statistic, df, p-value, inference, and warnings
- Detailed calculation tables:
  - Chi-square observed contingency table and expected-frequency table
  - ANOVA summary and ANOVA table
- Interactive charts via ECharts
- Multi-page structured PDF report export

## Project Structure

- `src/App.tsx`: UI state orchestration and rendering
- `src/lib/parsers.ts`: CSV/XLSX/sample parsing and mapping defaults
- `src/lib/recommendation.ts`: rule-based test recommendation
- `src/lib/statisticalEngines.ts`: chi-square, independent t-test, paired t-test, ANOVA engines
- `src/lib/chartOptions.ts`: chart option builders for each test type
- `src/lib/reporting.ts`: PDF report assembly/export

## Run Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Run automated tests:

```bash
npm run test
```

## How To Use

1. Load sample data, upload CSV/XLSX, or paste CSV text.
2. Set study design and alpha.
3. Confirm or override detected column types.
4. Map relevant columns (group/outcome or before/after or varA/varB).
5. Choose test mode:
   - Auto (recommended), or
   - Manual override with a specific test.
6. Run test, inspect tables/charts, then download PDF report.

## Notes

- Chi-square includes a sparse expected-cell warning.
- t-tests and ANOVA include assumption guidance and small-sample caution messages.
- Manual test override is available, but mapping still must satisfy that test's data requirements.
