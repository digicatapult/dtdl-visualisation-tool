import { Layout } from '../models/mermaidLayouts.js'
import { DiagramType } from './mermaidDiagrams.js'

export type output = 'svg' | 'png' | 'pdf'

export interface RootParams {
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
  diagramType: DiagramType
  highlightNodeId?: string
  search?: string
  expandedIds?: string[]
  shouldExpand?: boolean
  shouldTruncate?: boolean
  lastSearch?: string
}
export const urlQueryKeys = [
  'layout',
  'output',
  'diagramType',
  'highlightNodeId',
  'search',
  'expandedIds',
  'shouldExpand',
  'lastSearch',
] as const satisfies (keyof RootParams)[]
export type UrlQueryKeys = (typeof urlQueryKeys)[number]

export interface UpdateParams extends RootParams {
  svgWidth: number
  svgHeight: number
}
