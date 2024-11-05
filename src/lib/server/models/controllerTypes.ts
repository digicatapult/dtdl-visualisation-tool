import { Layout } from './mermaidLayouts.js'

export type output = 'svg' | 'png' | 'pdf'
export const chartTypes = ['flowchart']

export type ChartTypes = (typeof chartTypes)[number]

export interface QueryParams {
  /**
   * @default 'elk'
   */
  layout: Layout
  /**
   * @default 'svg'
   */
  output: output
  /**
   * @default 'flowchart'
   */
  chartType: ChartTypes
  highlightNodeId?: string
  search?: string
  expandedIds?: string[]
}
