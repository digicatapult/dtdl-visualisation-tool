import { EntityType } from '@digicatapult/dtdl-parser'

export const getDisplayName = (entity: EntityType): string => entity.displayName?.en ?? entity.Id
