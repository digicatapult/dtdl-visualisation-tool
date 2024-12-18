import { type DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { singleton } from 'tsyringe'
import { allInterfaceFilter } from './extract.js'

@singleton()
export class DtdlLoader {
  private dtdlModel: DtdlObjectModel

  constructor(dtdlModel: DtdlObjectModel) {
    this.dtdlModel = dtdlModel
  }

  getDtdlModel(): DtdlObjectModel {
    return this.dtdlModel
  }

  setDtdlModel(dtdlModel: DtdlObjectModel) {
    this.dtdlModel = dtdlModel
  }

  // collection for searching
  getCollection() {
    return Object.entries(this.dtdlModel)
      .filter(allInterfaceFilter)
      .map(([, entity]) => entity)
  }
}
