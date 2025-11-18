import express from 'express'
import { Body, Delete, Get, Middlewares, Path, Produces, Put, Queries, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import { ModelDb } from '../../../../db/modelDb.js'
import { DeletableEntities, type DeleteContentParams, type UpdateParams } from '../../../models/controllerTypes.js'
import { DtdlSchema, type DtdlId, type UUID } from '../../../models/strings.js'
import { Cache, type ICache } from '../../../utils/cache.js'

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { DtdlInterface, DtdlSourceOrEmpty } from '../../../../db/types.js'
import {
  deleteContent,
  deleteInterface,
  updateCommandComment,
  updateCommandDescription,
  updateCommandDisplayName,
  updateCommandRequestComment,
  updateCommandRequestDescription,
  updateCommandRequestDisplayName,
  updateCommandRequestSchema,
  updateCommandResponseComment,
  updateCommandResponseDescription,
  updateCommandResponseDisplayName,
  updateCommandResponseSchema,
  updateComment,
  updateDescription,
  updateDisplayName,
  updatePropertyComment,
  updatePropertyDescription,
  updatePropertyDisplayName,
  updatePropertySchema,
  updatePropertyWritable,
  updateRelationshipComment,
  updateRelationshipDescription,
  updateRelationshipDisplayName,
  updateRelationshipTarget,
  updateTelemetryComment,
  updateTelemetryDescription,
  updateTelemetryDisplayName,
  updateTelemetrySchema,
} from '../../../utils/dtdl/entityUpdate.js'
import { getDisplayName, isInterface, isNamedEntity } from '../../../utils/dtdl/extract.js'
import SessionStore from '../../../utils/sessions.js'
import MermaidTemplates from '../../../views/components/mermaid.js'
import { checkEditPermission } from '../../helpers.js'
import { HTML, HTMLController } from '../../HTMLController.js'
import { OntologyController } from '../index.js'

@injectable()
@Route('/ontology/{ontologyId}/entity')
@Produces('text/html')
@Middlewares(checkEditPermission)
export class EntityController extends HTMLController {
  constructor(
    private modelDb: ModelDb,
    private ontologyController: OntologyController,
    private templates: MermaidTemplates,
    private sessionStore: SessionStore,
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

    await this.putEntityValue(ontologyId, entityId, updateDisplayName(value))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/relationshipDisplayName')
  public async putRelationshipDisplayName(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; relationshipName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, relationshipName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateRelationshipDisplayName(value, relationshipName))

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

    await this.putEntityValue(ontologyId, entityId, updateDescription(value))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/relationshipDescription')
  public async putRelationshipDescription(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; relationshipName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, relationshipName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateRelationshipDescription(value, relationshipName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/comment')
  public async putComment(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string } & UpdateParams
  ): Promise<HTML> {
    const { value, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateComment(value))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/relationshipComment')
  public async putRelationshipComment(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; relationshipName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, relationshipName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateRelationshipComment(value, relationshipName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/relationshipTarget')
  public async putRelationshipTarget(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; relationshipName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, relationshipName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateRelationshipTarget(value, relationshipName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/propertyDisplayName')
  public async putPropertyDisplayName(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; propertyName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, propertyName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updatePropertyDisplayName(value, propertyName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/propertyDescription')
  public async putPropertyDescription(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; propertyName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, propertyName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updatePropertyDescription(value, propertyName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/propertyComment')
  public async putPropertyComment(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; propertyName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, propertyName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updatePropertyComment(value, propertyName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/propertySchema')
  public async putPropertySchema(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: DtdlSchema; propertyName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, propertyName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updatePropertySchema(value, propertyName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/propertyWritable')
  public async putPropertyWritable(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; propertyName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, propertyName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updatePropertyWritable(value === 'true', propertyName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/telemetryDisplayName')
  public async putTelemetryDisplayName(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; telemetryName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, telemetryName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateTelemetryDisplayName(value, telemetryName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/telemetrySchema')
  public async putTelemetrySchema(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: DtdlSchema; telemetryName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, telemetryName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateTelemetrySchema(value, telemetryName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/telemetryDescription')
  public async putTelemetryDescription(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; telemetryName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, telemetryName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateTelemetryDescription(value, telemetryName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/telemetryComment')
  public async putTelemetryComment(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; telemetryName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, telemetryName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateTelemetryComment(value, telemetryName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/commandDisplayName')
  public async putCommandDisplayName(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandDisplayName(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }
  @SuccessResponse(200)
  @Put('{entityId}/commandDescription')
  public async putCommandDescription(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandDescription(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }
  @SuccessResponse(200)
  @Put('{entityId}/commandComment')
  public async putCommandComment(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandComment(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/commandRequestDisplayName')
  public async putCommandRequestDisplayName(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandRequestDisplayName(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/commandRequestComment')
  public async putCommandRequestComment(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandRequestComment(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/commandRequestDescription')
  public async putCommandRequestDescription(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandRequestDescription(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/commandRequestSchema')
  public async putCommandRequestSchema(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: DtdlSchema; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandRequestSchema(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/commandResponseDisplayName')
  public async putCommandResponseDisplayName(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandResponseDisplayName(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/commandResponseComment')
  public async putCommandResponseComment(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandResponseComment(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/commandResponseDescription')
  public async putCommandResponseDescription(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: string; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandResponseDescription(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Put('{entityId}/commandResponseSchema')
  public async putCommandResponseSchema(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Body() body: { value: DtdlSchema; commandName: string } & UpdateParams
  ): Promise<HTML> {
    const { value, commandName, ...updateParams } = body

    await this.putEntityValue(ontologyId, entityId, updateCommandResponseSchema(value, commandName))

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }
  @SuccessResponse(200)
  @Produces('text/html')
  @Get('{entityId}/deleteDialog')
  public async deleteDialog(@Path() ontologyId: UUID, @Path() entityId: DtdlId): Promise<HTML> {
    const { model } = await this.modelDb.getDtdlModelAndTree(ontologyId)
    const entity = model[entityId]
    const definedIn = entity.DefinedIn ?? entityId

    const query = {
      entityKind: entity.EntityKind as DeletableEntities,
      definedIn: entity.DefinedIn ?? entityId,
      contentName: isNamedEntity(entity) ? entity.name : '',
      displayName: getDisplayName(entity),
      definedInDisplayName: definedIn !== entityId ? getDisplayName(model[definedIn]) : undefined,
    }
    return this.html(this.templates.deleteDialog(query))
  }

  @SuccessResponse(200)
  @Produces('text/html')
  @Delete('{entityId}')
  public async deleteInterface(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Queries() updateParams: UpdateParams
  ): Promise<HTML> {
    const { model } = await this.modelDb.getDtdlModelAndTree(ontologyId)
    const extendedBys = this.getExtendedBy(model, entityId)

    await this.deleteInterfaces(ontologyId, [entityId, ...extendedBys])

    this.sessionStore.update(updateParams.sessionId, { highlightNodeId: '' })
    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  @SuccessResponse(200)
  @Produces('text/html')
  @Delete('{entityId}/content')
  public async deleteContent(
    @Request() req: express.Request,
    @Path() ontologyId: UUID,
    @Path() entityId: DtdlId,
    @Queries() queries: DeleteContentParams
  ): Promise<HTML> {
    const { contentName, ...updateParams } = queries

    await this.putEntityValue(ontologyId, entityId, deleteContent(contentName))
    this.sessionStore.update(updateParams.sessionId, { highlightNodeId: '' })

    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
  }

  putEntityValue = async (
    ontologyId: UUID,
    entityId: DtdlId,
    updateFn: (dtdlInterface: DtdlInterface) => DtdlInterface
  ) => {
    const { id, source } = await this.modelDb.getDtdlSourceByInterfaceId(ontologyId, entityId)

    const updatedSource = Array.isArray(source)
      ? source.map((c) => (c['@id'] === entityId ? updateFn(c) : c))
      : updateFn(source)

    // validate new DTDL parses before saving
    await this.modelDb.parseWithUpdatedFiles(ontologyId, [{ id, source: updatedSource }])
    await this.modelDb.updateDtdlSource(id, JSON.stringify(updatedSource))

    this.cache.clear()
  }

  deleteInterfaces = async (ontologyId: UUID, interfaceIds: DtdlId[]) => {
    const sources: { id: UUID; source: string }[] = []
    const updates = new Map<DtdlId, { id: DtdlId; source: DtdlSourceOrEmpty }>() // track source updates in case same source updated multiple times
    for (const interfaceId of interfaceIds) {
      const { id, source } = await this.modelDb.getDtdlSourceByInterfaceId(ontologyId, interfaceId)
      const alreadyUpdated = updates.get(id)
      const updatedSource = alreadyUpdated ? deleteInterface(id, alreadyUpdated.source) : deleteInterface(id, source)
      updates.set(interfaceId, { id: interfaceId, source: updatedSource })
    }
    await this.modelDb.parseWithUpdatedFiles(ontologyId, Array.from(updates.values()))
    await this.modelDb.deleteOrUpdateDtdlSource(sources)

    this.cache.clear()
  }

  getExtendedBy = (model: DtdlObjectModel, entityId: UUID): DtdlId[] => {
    const entity = model[entityId]
    if (!isInterface(entity)) return []
    return entity.extendedBy.flatMap((e) => [e, ...this.getExtendedBy(model, e)])
  }
}
