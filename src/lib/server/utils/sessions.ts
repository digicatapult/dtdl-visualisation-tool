import { singleton } from 'tsyringe'

import { DiagramType } from '../models/mermaidDiagrams.js'
import { Layout } from '../models/mermaidLayouts.js'

export type Session = {
  layout: Layout
  diagramType: DiagramType
  search?: string
  highlightNodeId?: string
  expandedIds: string[]
}

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
