import { UUID } from './strings'

export interface RecentFile {
  fileName: string
  lastVisited: string
  preview: JSX.Element
  dtdlModelId: UUID
}
