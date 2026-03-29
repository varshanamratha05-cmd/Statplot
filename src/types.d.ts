declare module 'jstat' {
  export const jStat: {
    chisquare: { cdf: (x: number, dof: number) => number }
    studentt: { cdf: (x: number, dof: number) => number }
    centralF: { cdf: (x: number, dof1: number, dof2: number) => number }
  }
}
