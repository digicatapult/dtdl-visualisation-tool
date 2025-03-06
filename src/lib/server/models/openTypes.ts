import { UUID } from './strings'

export interface RecentFile {
  fileName: string
  lastVisited: string
  preview: JSX.Element
  dtdlModelId: UUID
}

export const fileSource = ['default', 'zip', 'github'] as const
export type FileSourceKeys = (typeof fileSource)[number]
