export const layoutEntries = [
  'dagre-d3',
  'dagre-wrapper',
  'elk.stress',
  'elk.force',
  'elk.mrtree',
  'elk.sporeOverlap',
  'elk',
] as const

export type Layout = (typeof layoutEntries)[number]
