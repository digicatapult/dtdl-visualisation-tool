import { Layout } from '../models/mermaidLayouts.js'
import { DiagramType } from './mermaidDiagrams.js'

export interface RootParams {
  /**
   * @default 'elk'
   */
  layout: Layout
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
  'diagramType',
  'highlightNodeId',
  'search',
  'expandedIds',
  'shouldExpand',
  'shouldTruncate',
  'lastSearch',
] as const satisfies (keyof RootParams)[]
export type UrlQueryKeys = (typeof urlQueryKeys)[number]

export interface UpdateParams extends RootParams {
  svgWidth: number
  svgHeight: number
  currentZoom: number
  currentPanX: number
  currentPanY: number
}
