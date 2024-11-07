export const layoutEntries = ['elk', 'dagre-d3'] as const

export type Layout = (typeof layoutEntries)[number]
