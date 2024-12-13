import { type DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { randomUUID } from 'crypto'
import { singleton } from 'tsyringe'
import { UUID } from '../../models/strings'

@singleton()
export class DtdlLoader {
  private dtdlModels: Map<UUID, DtdlObjectModel>
  private defaultDtdlModelId: UUID

  constructor(defaultModel: DtdlObjectModel) {
    this.dtdlModels = new Map<UUID, DtdlObjectModel>()
    this.defaultDtdlModelId = this.setDtdlModel(defaultModel)
  }

  getDefaultDtdlModelId(): UUID {
    return this.defaultDtdlModelId
  }

  getDtdlModel(id: UUID): DtdlObjectModel {
    const dtdlModel = this.dtdlModels.get(id)
    if (!dtdlModel) throw Error()
    return dtdlModel
  }

  setDtdlModel(dtdlObjectModel: DtdlObjectModel): UUID {
    const dtdlModelId = randomUUID()
    this.dtdlModels.set(dtdlModelId, dtdlObjectModel)
    return dtdlModelId
  }
}
