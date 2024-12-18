import { type DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { container, singleton } from 'tsyringe'
import Database from '../../../db/index.js'
import { InternalError } from '../../errors.js'
import { UUID } from '../../models/strings.js'
import { allInterfaceFilter } from './extract.js'

@singleton()
export class DtdlLoader {
  private defaultModel: DtdlObjectModel
  private db: Database

  constructor(dtdlModel: DtdlObjectModel) {
    this.defaultModel = dtdlModel
    this.db = container.resolve(Database)
  }

  async getDtdlModel(id?: UUID): Promise<DtdlObjectModel> {
    if (!id) return this.defaultModel

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
