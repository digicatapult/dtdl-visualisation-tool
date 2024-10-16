import { type DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { singleton } from 'tsyringe'

@singleton()
export class DtdlLoader {
  private defaultDtdlModel: DtdlObjectModel

  constructor(dtdlObjectModel: DtdlObjectModel) {
    this.defaultDtdlModel = dtdlObjectModel
  }

  getDefaultDtdlModel(): DtdlObjectModel {
    return this.defaultDtdlModel
  }
}
