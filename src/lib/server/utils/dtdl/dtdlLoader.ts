import { type DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { randomUUID } from 'crypto'
import { singleton } from 'tsyringe'
import { UUID } from '../../models/strings'

@singleton()
export class DtdlLoader {
  private dtdlModels: Map<UUID, DtdlObjectModel>
  private currentDtdlModelId: UUID

  constructor(model?: DtdlObjectModel) {
    this.dtdlModels = new Map<UUID, DtdlObjectModel>()
    this.currentDtdlModelId = ''

    if (model) this.setDtdlModel(model)
  }

  getCurrentDtdlModelId(): UUID {
    return this.currentDtdlModelId
  }

  getDtdlModel(id: UUID): DtdlObjectModel {
    const dtdlModel = this.dtdlModels.get(id)
    if (!dtdlModel) throw Error()
    return dtdlModel
  }

  setDtdlModel(dtdlObjectModel: DtdlObjectModel): UUID {
    const dtdlModelId = randomUUID()
    this.dtdlModels.set(dtdlModelId, dtdlObjectModel)
    this.currentDtdlModelId = dtdlModelId
    return dtdlModelId
  }
}
