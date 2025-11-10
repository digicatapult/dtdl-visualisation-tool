import { Session } from '../utils/sessions.js'
import { DiagramType } from './mermaidDiagrams.js'
import { DtdlId, UUID } from './strings.js'

export interface RootParams {
  /**
   * @default 'flowchart'
   */
  diagramType: DiagramType

  highlightNodeId?: string

  search?: string
  sessionId?: UUID
}
export const urlQueryKeys = ['diagramType', 'highlightNodeId', 'search'] as const satisfies (keyof RootParams)[]
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
  navigationPanelTab?: 'details' | 'tree'
  navigationPanelExpanded?: boolean
}

export interface CookieHistoryParams {
  id: UUID
  timestamp: number
}

export const relevantParams = ['search', 'diagramType', 'layout', 'expandedIds'] as const
export type GenerateParamKeys = (typeof relevantParams)[number]
export type GenerateParams = Pick<UpdateParams & Session, GenerateParamKeys>

export type AttributeParamKeys = 'svgWidth' | 'svgHeight' | 'highlightNodeId' | 'diagramType'
export type AttributeParams = Pick<UpdateParams, AttributeParamKeys>

export type EntityEntityUpdateBody = UpdateParams & {
  definedIn: DtdlId
  value: string
}
