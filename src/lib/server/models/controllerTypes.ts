import { Layout } from '../models/mermaidLayouts.js'
import { DiagramType } from './mermaidDiagrams.js'

export type output = 'svg' | 'png' | 'pdf'

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
  diagramType: DiagramType
  highlightNodeId?: string
  search?: string
  expandedIds?: string[]
  lastSearch?: string
}
