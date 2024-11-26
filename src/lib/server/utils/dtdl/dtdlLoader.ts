import { EntityType, type DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { singleton } from 'tsyringe'
import { type ISearch } from '../search.js'
import { getDisplayName } from './extract.js'

@singleton()
export class DtdlLoader {
  private defaultDtdlModel: DtdlObjectModel
  private entityPairs: [string, EntityType][]
  private search: ISearch<EntityType>

  constructor(dtdlObjectModel: DtdlObjectModel, search: ISearch<EntityType>) {
    this.defaultDtdlModel = dtdlObjectModel

    this.entityPairs = Object.entries(dtdlObjectModel)
    const interfaces: EntityType[] = this.entityPairs.filter(this.allInterfaceFilter).map(([, entity]) => entity)
    search.setCollection(interfaces)
    this.search = search
  }

  getDefaultDtdlModel(): DtdlObjectModel {
    return this.defaultDtdlModel
  }

  getEntityPairs(): [string, EntityType][] {
    return this.entityPairs
  }

  getSearch(): ISearch<EntityType> {
    return this.search
  }

  private allInterfaceFilter = () => {
    return ([, entity]: [unknown, EntityType]) =>
      entity.EntityKind === 'Interface' && getDisplayName(entity).toLowerCase()
  }
}
