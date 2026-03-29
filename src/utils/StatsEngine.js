import jStat from 'jstat';

/**
 * Categorizes columns into 'numerical' or 'categorical' based on content.
 */
export const categorizeColumns = (data) => {
  if (!data?.length) return {};
  const columns = Object.keys(data[0]);
  const categories = {};

  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
    const numericValues = values.filter(v => !isNaN(parseFloat(v)) && isFinite(v));
    
    // If more than 80% are numbers, it's numerical; otherwise categorical.
    categories[col] = (numericValues.length / values.length > 0.8) ? 'numerical' : 'categorical';
  });

  return categories;
};

/**
 * Calculates One-Way ANOVA.
 * @param {Array} data - Array of objects.
 * @param {string} catCol - Categorical grouping column.
 * @param {string} numCol - Numerical value column.
 */
export const runANOVA = (data, catCol, numCol) => {
  const groups = {};
  data.forEach(row => {
    const groupVal = String(row[catCol]);
    const numVal = parseFloat(row[numCol]);
    if (!isNaN(numVal)) {
      if (!groups[groupVal]) groups[groupVal] = [];
      groups[groupVal].push(numVal);
    }
  });

  const groupArrays = Object.values(groups);
  if (groupArrays.length < 2) return null;

  try {
    const fStat = jStat.anova(groupArrays);
    // jStat.anova returns p-value? No, jStat has f.dist to get p-value from F-stat.
    // Wait, let's calculate manually or use jStat's built-in if available.
    // Actually, simple calculation:
    const k = groupArrays.length; // num groups
    const N = groupArrays.flat().length; // total N
    if (N <= k) return null;

    // F-distribution (k-1, N-k)
    // jStat.anova is for F-score. We then need the p-value:
    const pValue = 1 - jStat.centralF.cdf(fStat, k - 1, N - k);

    return {
      fStat,
      pValue,
      df1: k - 1,
      df2: N - k,
      interpretation: pValue < 0.05 
        ? "Statistically Significant. There is a meaningful difference between categories." 
        : "Not Statistically Significant. No strong evidence of difference."
    };
  } catch (err) {
    console.error("ANOVA Error:", err);
    return null;
  }
};

/**
 * Calculates Pearson's Chi-Square Test.
 * @param {Array} data - Array of objects.
 * @param {string} col1 - Categorical column 1.
 * @param {string} col2 - Categorical column 2.
 */
export const runChiSquare = (data, col1, col2) => {
  const contingencyTable = {};
  const rowTotals = {};
  const colTotals = {};
  let totalCount = 0;

  data.forEach(row => {
    const val1 = String(row[col1]) || 'Missing';
    const val2 = String(row[col2]) || 'Missing';
    
    if (!contingencyTable[val1]) contingencyTable[val1] = {};
    if (!contingencyTable[val1][val2]) contingencyTable[val1][val2] = 0;
    
    contingencyTable[val1][val2]++;
    rowTotals[val1] = (rowTotals[val1] || 0) + 1;
    colTotals[val2] = (colTotals[val2] || 0) + 1;
    totalCount++;
  });

  const rowKeys = Object.keys(rowTotals);
  const colKeys = Object.keys(colTotals);
  const df = (rowKeys.length - 1) * (colKeys.length - 1);
  if (df <= 0) return null;

  let chiSq = 0;
  rowKeys.forEach(r => {
    colKeys.forEach(c => {
      const observed = contingencyTable[r][c] || 0;
      const expected = (rowTotals[r] * colTotals[c]) / totalCount;
      if (expected > 0) {
        chiSq += Math.pow(observed - expected, 2) / expected;
      }
    });
  });

  const pValue = 1 - jStat.chisquare.cdf(chiSq, df);

  return {
    chiSq,
    pValue,
    df,
    interpretation: pValue < 0.05 
      ? "Statistically Significant association detected between groups." 
      : "Not Statistically Significant association between groups."
  };
};

/**
 * Summarizes data for dashboard health card.
 */
export const summarizeData = (data) => {
  if (!data?.length) return null;
  const rows = data.length;
  const cols = Object.keys(data[0]).length;
  let missing = 0;
  data.forEach(r => {
    Object.values(r).forEach(v => {
      if (v === null || v === undefined || v === '') missing++;
    });
  });
  
  const totalCells = rows * cols;
  const healthScore = totalCells > 0 ? (1 - (missing / totalCells)) * 100 : 0;

  return {
    rows,
    cols,
    missing,
    healthScore: healthScore.toFixed(2)
  };
};
