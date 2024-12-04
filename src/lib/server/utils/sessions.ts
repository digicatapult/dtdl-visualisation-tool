import { inject, singleton } from 'tsyringe'
import { z } from 'zod'

import { DiagramType } from '../models/mermaidDiagrams.js'
import { Layout } from '../models/mermaidLayouts.js'
import { type ICache, Cache } from './cache.js'

const sessionParser = z.object({
  layout: z.union([z.literal('elk'), z.literal('dagre-d3')]) satisfies z.ZodType<Layout>,
  diagramType: z.union([z.literal('flowchart'), z.literal('classDiagram')]) satisfies z.ZodType<DiagramType>,
  search: z.string().optional(),
  highlightNodeId: z.string().optional(),
  expandedIds: z.array(z.string()),
})
export type Session = z.infer<typeof sessionParser>

@singleton()
export default class SessionStore {
  constructor(@inject(Cache) private cache: ICache) {}

  get(sessionId: string) {
    const fromCache = this.cache.get(sessionId)
    if (!fromCache) return undefined

    return sessionParser.parse(JSON.parse(fromCache))
  }

  set(sessionId: string, session: Session) {
    this.cache.set(sessionId, JSON.stringify(session))
  }
}
