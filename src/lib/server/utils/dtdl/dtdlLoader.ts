import { singleton } from "tsyringe";
import { type DtdlObjectModel } from "../../../../../interop/DtdlOm";


@singleton()
export class DtdlLoader {
    private defaultDtdlModel: DtdlObjectModel

    constructor(dtdlObjectModel: DtdlObjectModel){
        this.defaultDtdlModel = dtdlObjectModel
    }

    getDefaultDtdlModel():DtdlObjectModel{
        return this.defaultDtdlModel
    }

}