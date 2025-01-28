import { type DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { singleton } from 'tsyringe'
import Database from '../../../db/index.js'
import { InternalError } from '../../errors.js'
import { type UUID } from '../../models/strings.js'
import { allInterfaceFilter } from './extract.js'

@singleton()
export class DtdlLoader {
  private db: Database
  private defaultModelId: UUID

  constructor(db: Database, defaultModelId: UUID) {
    this.defaultModelId = defaultModelId
    this.db = db
  }

  getDefaultId() {
    return this.defaultModelId
  }

  async getDtdlModel(id: UUID): Promise<DtdlObjectModel> {
    const [model] = await this.db.get('model', { id })

    if (!model) throw new InternalError(`Failed to find model: ${id}`)
    return model.parsed as DtdlObjectModel
  }

  // collection for searching
  getCollection(dtdlModel: DtdlObjectModel) {
    return Object.entries(dtdlModel)
      .filter(allInterfaceFilter)
      .map(([, entity]) => entity)
  }
}
