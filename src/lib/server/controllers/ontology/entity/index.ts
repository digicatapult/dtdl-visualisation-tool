import express from 'express'
import { Body, Path, Produces, Put, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import { ModelDb } from '../../../../db/modelDb.js'
import { DataError } from '../../../errors.js'
import { UpdateParams } from '../../../models/controllerTypes.js'
import { type DtdlId, type UUID } from '../../../models/strings.js'
import { Cache, type ICache } from '../../../utils/cache.js'
import { updateDescription, updateDisplayName, updateInterfaceComment } from '../../../utils/dtdl/entityUpdate.js'
import { HTML, HTMLController } from '../../HTMLController.js'
import { OntologyController } from '../index.js'

@injectable()
@Route('/ontology/{ontologyId}/entity')
@Produces('text/html')
export class EntityController extends HTMLController {
  constructor(
    private modelDb: ModelDb,
    private ontologyController: OntologyController,
    @inject(Cache) private cache: ICache
  ) {
    super()
  }

  @SuccessResponse(200)
  @Put('{entityId}/displayName')
  public async putDisplayName(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string } & UpdateParams
  ): Promise<HTML> {
    const { value, ...updateParams } = body

    const invalidChars = /["\\]/
    if (invalidChars.test(value)) throw new DataError(`Invalid JSON: '${value}'`)

    await this.putEntityValue(ontologyId, entityId, updateDisplayName(value))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/description')
  public async putDescription(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string } & UpdateParams
  ): Promise<HTML> {
    const { value, ...updateParams } = body

    const invalidChars = /["\\]/
    if (invalidChars.test(value)) throw new DataError(`Invalid JSON: '${value}'`)

    await this.putEntityValue(ontologyId, entityId, updateDescription(value))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/interfaceComment')
  public async putInterfaceComment(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string } & UpdateParams
  ): Promise<HTML> {
    const { value, ...updateParams } = body

    const invalidChars = /["\\]/
    if (invalidChars.test(value)) throw new DataError(`Invalid JSON: '${value}'`)

    await this.putEntityValue(ontologyId, entityId, updateInterfaceComment(value))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  putEntityValue = async (ontologyId: UUID, entityId: UUID, updateFn: (entity: unknown) => unknown) => {
    const { id, contents } = await this.modelDb.getDtdlByEntityId(ontologyId, entityId)

    // DTDL files can be array or single object
    const updatedContents = Array.isArray(contents)
      ? contents.map((c) => (c['@id'] === entityId ? updateFn(c) : c))
      : updateFn(contents)

    // validate new DTDL parses before saving
    await this.modelDb.parseWithUpdatedFile(ontologyId, id, JSON.stringify(updatedContents))
    await this.modelDb.updateDtdlContents(id, JSON.stringify(updatedContents))

    this.cache.clear()
  }
}
