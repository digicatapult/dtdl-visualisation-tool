import { Layout } from '../models/mermaidLayouts.js'
import { Session } from '../utils/sessions.js'
import { DiagramType } from './mermaidDiagrams.js'
import { UUID } from './strings.js'

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
  sessionId?: UUID
}
export const urlQueryKeys = [
  'layout',
  'diagramType',
  'highlightNodeId',
  'search',
] as const satisfies (keyof RootParams)[]
export type UrlQueryKeys = (typeof urlQueryKeys)[number]

export type A11yPreference = 'reduce-motion'
export interface UpdateParams extends RootParams {
  sessionId: UUID
  shouldExpand?: boolean
  shouldTruncate?: boolean
  svgWidth: number
  svgHeight: number
  currentZoom: number
  currentPanX: number
  currentPanY: number
  a11y?: A11yPreference[]
}

export const relevantParams = ['search', 'diagramType', 'layout', 'expandedIds'] as const
export type GenerateParamKeys = (typeof relevantParams)[number]
export type GenerateParams = Pick<UpdateParams & Session, GenerateParamKeys>
