import jStat from 'jstat';

/**
 * Identify column types (Categorical vs Numerical)
 */
export const identifyColumns = (data) => {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  
  return keys.map(key => {
    const values = data.map(item => item[key]).filter(v => v !== null && v !== undefined);
    const isNumeric = values.every(v => !isNaN(parseFloat(v)) && isFinite(v));
    const uniqueCount = new Set(values).size;
    
    return {
      name: key,
      type: isNumeric ? 'numerical' : 'categorical',
      uniqueCount,
      missingCount: data.length - values.length
    };
  });
};

/**
 * One-Way ANOVA
 * Groups: categorical column values
 * Values: numerical column values
 */
export const runANOVA = (data, groupCol, valueCol) => {
  const groups = {};
  data.forEach(item => {
    const group = item[groupCol];
    const val = parseFloat(item[valueCol]);
    if (!isNaN(val)) {
      if (!groups[group]) groups[group] = [];
      groups[group].push(val);
    }
  });

  const groupData = Object.values(groups);
  if (groupData.length < 2) return { error: "Insufficient groups for ANOVA" };

  try {
    const fStat = jStat.anovafe(...groupData);
    // jStat.anovafe returns F-statistic. We need to find P-value using F-distribution.
    // df1 = k - 1, df2 = N - k
    const k = groupData.length;
    const N = groupData.reduce((acc, g) => acc + g.length, 0);
    const df1 = k - 1;
    const df2 = N - k;
    
    // F-distribution CDF to get p-value
    const pValue = 1 - jStat.centralF.cdf(fStat, df1, df2);

    return {
      testName: "One-Way ANOVA",
      fStatistic: fStat.toFixed(4),
      pValue: pValue.toFixed(4),
      df1,
      df2,
      significant: pValue < 0.05,
      interpretation: pValue < 0.05 
        ? `Statistically significant difference (p < 0.05). Reject H0.` 
        : `No statistically significant difference. Fail to reject H0.`
    };
  } catch (e) {
    return { error: e.message };
  }
};

/**
 * Chi-Square Test of Independence
 * colA: categorical
 * colB: categorical
 */
export const runChiSquare = (data, colA, colB) => {
  const levelsA = [...new Set(data.map(d => d[colA]))];
  const levelsB = [...new Set(data.map(d => d[colB]))];
  
  // Create contingency table
  const observed = levelsA.map(a => {
    return levelsB.map(b => {
      return data.filter(d => d[colA] === a && d[colB] === b).length;
    });
  });

  try {
    // jStat.chisquare.test(observedMatrix) or similar? 
    // Older jStat might not have it built-in for matrix. Let's calculate manually.
    const rowSums = observed.map(row => row.reduce((a, b) => a + b, 0));
    const total = rowSums.reduce((a, b) => a + b, 0);
    const colSums = levelsB.map((_, i) => observed.reduce((acc, row) => acc + row[i], 0));
    
    let chiSquare = 0;
    observed.forEach((row, i) => {
      row.forEach((cell, j) => {
        const expected = (rowSums[i] * colSums[j]) / total;
        if (expected > 0) {
          chiSquare += Math.pow(cell - expected, 2) / expected;
        }
      });
    });

    const df = (levelsA.length - 1) * (levelsB.length - 1);
    const pValue = 1 - jStat.chisquare.cdf(chiSquare, df);

    return {
      testName: "Pearson's Chi-Square",
      statistic: chiSquare.toFixed(4),
      pValue: pValue.toFixed(4),
      df,
      significant: pValue < 0.05,
      interpretation: pValue < 0.05 
        ? `Variables are significantly dependent (p < 0.05).`
        : `No significant association found.`
    };
  } catch (e) {
    return { error: e.message };
  }
};
