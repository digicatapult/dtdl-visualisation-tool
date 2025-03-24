import { singleton } from 'tsyringe'

import { InvalidQueryError } from '../errors.js'
import { DiagramType } from '../models/mermaidDiagrams.js'
import { Layout } from '../models/mermaidLayouts.js'

export type Session = {
  layout: Layout
  diagramType: DiagramType
  search?: string
  highlightNodeId?: string
  expandedIds: string[]
  returnUrl?: string
  editMode?: boolean
}

@singleton()
export default class SessionStore {
  store: Map<string, Session> = new Map()

  constructor() {}

  get(sessionId: string) {
    const session = this.store.get(sessionId)

    if (!session) {
      throw new InvalidQueryError(
        'Session Error',
        'Please refresh the page or try again later',
        `Session ${sessionId} not found in session store`,
        false
      )
    }

    return session
  }

  set(sessionId: string, session: Session) {
    this.store.set(sessionId, session)
  }

  update(sessionId: string, sessionUpdate: Partial<Session>) {
    const session = this.get(sessionId)

    if (!session) {
      throw new InvalidQueryError(
        'Session Error',
        'Please refresh the page or try again later',
        `Session ${sessionId} not found in session store`,
        false
      )
    }

    this.store.set(sessionId, { ...session, ...sessionUpdate })
  }
}
