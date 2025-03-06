import { type DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { singleton } from 'tsyringe'
import Database from '../../../db/index.js'
import { ModelDb } from '../../../db/modelDb.js'
import { ModelRow } from '../../../db/types.js'
import { type UUID } from '../../models/strings.js'
import { allInterfaceFilter } from './extract.js'

@singleton()
export class DtdlLoader {
  private defaultModelId: UUID
  private modelDb: ModelDb

  constructor(db: Database, defaultModelId: UUID) {
    this.defaultModelId = defaultModelId
    this.modelDb = new ModelDb(db)
  }

  getDefaultId() {
    return this.defaultModelId
  }

  async getDatabaseModel(id: UUID): Promise<ModelRow> {
    return this.modelDb.getModelById(id)
  }
  async getDtdlModel(id: UUID): Promise<DtdlObjectModel> {
    const { parsed } = await this.getDatabaseModel(id)
    return parsed as DtdlObjectModel
  }

  // collection for searching
  getCollection(dtdlModel: DtdlObjectModel) {
    return Object.entries(dtdlModel)
      .filter(allInterfaceFilter)
      .map(([, entity]) => entity)
  }
}
