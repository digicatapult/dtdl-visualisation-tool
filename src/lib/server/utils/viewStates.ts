import { singleton } from 'tsyringe'

import { InvalidQueryError } from '../errors.js'
import { DiagramType } from '../models/mermaidDiagrams.js'
import { Layout } from '../models/mermaidLayouts.js'

export type ViewState = {
  layout: Layout
  diagramType: DiagramType
  search?: string
  highlightNodeId?: string
  expandedIds: string[]
  returnUrl?: string
  editMode?: boolean
}

@singleton()
export default class ViewStateStore {
  store: Map<string, ViewState> = new Map()

  constructor() {}

  get(viewId: string) {
    const viewState = this.store.get(viewId)

    if (!viewState) {
      throw new InvalidQueryError(
        'View Error',
        'Please refresh the page or try again later',
        `View ${viewId} not found in view store`,
        false
      )
    }

    return viewState
  }

  set(viewId: string, viewState: ViewState) {
    this.store.set(viewId, viewState)
  }

  update(viewId: string, viewStateUpdate: Partial<ViewState>) {
    const viewState = this.get(viewId)

    if (!viewState) {
      throw new InvalidQueryError(
        'View Error',
        'Please refresh the page or try again later',
        `View ${viewId} not found in view store`,
        false
      )
    }

    this.store.set(viewId, { ...viewState, ...viewStateUpdate })
  }
}
