export const layoutEntries = [
  'dagre',
  'dagre-wrapper',
  'elk.stress',
  'elk.force',
  'elk.mrtree',
  'elk.sporeOverlap',
] as const

export type Layout = 'dagre' | 'dagre-wrapper' | 'elk.stress' | 'elk.force' | 'elk.mrtree' | 'elk.sporeOverlap'
