import { singleton } from 'tsyringe'
import { z } from 'zod'

import { DiagramType } from '../models/mermaidDiagrams.js'
import { Layout } from '../models/mermaidLayouts.js'

const sessionParser = z.object({
  layout: z.union([z.literal('elk'), z.literal('dagre-d3')]) satisfies z.ZodType<Layout>,
  diagramType: z.union([z.literal('flowchart'), z.literal('classDiagram')]) satisfies z.ZodType<DiagramType>,
  search: z.string().optional(),
  highlightNodeId: z.string().optional(),
  expandedIds: z.array(z.string()),
  dtdlModelId: z.string().optional(),
})
export type Session = z.infer<typeof sessionParser>

@singleton()
export default class SessionStore {
  store: Map<string, Session> = new Map()

  constructor() {}

  get(sessionId: string) {
    return this.store.get(sessionId)
  }

  set(sessionId: string, session: Session) {
    this.store.set(sessionId, session)
  }
}
