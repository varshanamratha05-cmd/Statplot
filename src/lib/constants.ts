import type { MappingState, TestType } from './types'

export const SAMPLE_DATASETS: Record<TestType, { title: string; csv: string }> = {
  'chi-square': {
    title: 'Snack Preference by Gender',
    csv: `gender,preference
Male,Chips
Male,Chips
Male,Fruit
Male,Cookies
Female,Fruit
Female,Fruit
Female,Cookies
Female,Cookies
Female,Chips
Male,Cookies
Female,Fruit
Male,Chips`,
  },
  'independent-t': {
    title: 'Two Independent Classes Performance',
    csv: `class,score
A,68
A,72
A,74
A,70
A,69
B,78
B,80
B,76
B,79
B,81`,
  },
  'paired-t': {
    title: 'Before vs After Training',
    csv: `before,after
52,58
60,66
48,52
55,61
62,67
58,62
50,56
57,61`,
  },
  anova: {
    title: 'Scores in Three Teaching Methods',
    csv: `method,score
Lecture,62
Lecture,65
Lecture,60
Workshop,71
Workshop,75
Workshop,73
Hybrid,79
Hybrid,82
Hybrid,84`,
  },
}

export const TEST_LABELS: Record<TestType, string> = {
  'chi-square': 'Chi-square Test of Independence',
  'independent-t': 'Independent t-test',
  'paired-t': 'Paired t-test',
  anova: 'One-way ANOVA',
}

export const INITIAL_MAPPING: MappingState = {
  varA: '',
  varB: '',
  group: '',
  outcome: '',
  before: '',
  after: '',
}
