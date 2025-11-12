import express from 'express'
import { Body, Delete, Get, Middlewares, Path, Produces, Put, Queries, Request, Route, SuccessResponse } from 'tsoa'
import { inject, injectable } from 'tsyringe'
import { ModelDb } from '../../../../db/modelDb.js'
import { DeletableEntities, type DeleteContentParams, type UpdateParams } from '../../../models/controllerTypes.js'
import { DtdlSchema, type DtdlId, type UUID } from '../../../models/strings.js'
import { Cache, type ICache } from '../../../utils/cache.js'

import { InternalError } from '../../../errors.js'
import {
  deleteContent,
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
  updateTelemetryComment,
  updateTelemetryDescription,
  updateTelemetryDisplayName,
  updateTelemetrySchema,
} from '../../../utils/dtdl/entityUpdate.js'
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
  @Produces('text/html')
  @Get('{entityId}/deleteDialog')
  public async deleteDialog(
    @Queries()
    query: {
      displayName?: string
      entityKind?: DeletableEntities
      definedIn?: string
      definedInDisplayName?: string
      contentName?: string
    }
  ): Promise<HTML> {
    return this.html(this.templates.deleteDialog(query))
  }

  @SuccessResponse(200)
  @Produces('text/html')
  @Delete('{entityId}')
  public async deleteInterface(): Promise<HTML> {
    throw new InternalError('Not implemented yet')
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
