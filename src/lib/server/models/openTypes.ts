import { UUID } from './strings'

export interface RecentFile {
  fileName: string
  lastVisited: string
  preview: string
  dtdlModelId: UUID
}
