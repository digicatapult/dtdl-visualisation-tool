import express from 'express'
import {
  Body,
  Delete,
  Get,
  Middlewares,
  Path,
  Post,
  Produces,
  Put,
  Queries,
  Request,
  Route,
  SuccessResponse,
} from 'tsoa'
import { inject, injectable } from 'tsyringe'
import { ModelDb } from '../../../../db/modelDb.js'
import { InternalError } from '../../../errors.js'
import { DeletableEntities, type DeleteContentParams, type UpdateParams } from '../../../models/controllerTypes.js'
import { DtdlSchema, type DtdlId, type UUID } from '../../../models/strings.js'
import { Cache, type ICache } from '../../../utils/cache.js'
import { dtdlIdReplaceSemicolon } from '../../../utils/mermaid/helpers.js'

import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { DtdlInterface, NullableDtdlSource } from '../../../../db/types.js'
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
  @Get('/add-new-node')
  public async addNewNode(@Path() ontologyId: UUID, @Queries() params: UpdateParams): Promise<HTML | void> {
    this.sessionStore.update(params.sessionId, { highlightNodeId: undefined, search: undefined })

    const { model: baseModel, fileTree } = await this.modelDb.getDtdlModelAndTree(ontologyId)
    const displayNameIdMap = this.getDisplayNameIdMap(baseModel)
    const filteredFolderPaths = this.filterDirectoriesOnly(fileTree)

    return this.html(
      this.templates.addNode({
        dtdlModelId: ontologyId,
        displayNameIdMap,
        folderTree: filteredFolderPaths,
        swapOutOfBand: true, // ensures right panel updates
      })
    )
  }

  @SuccessResponse(201)
  @Post('/new-node')
  public async createNewNode(
    @Path() ontologyId: UUID,
    @Body()
    body: {
      displayName: string
      description?: string
      comment?: string
      extends?: string
      folderPath: string
    } & UpdateParams,
    @Request() req: express.Request
  ): Promise<HTML> {
    const { displayName: rawDisplayName, description, comment, extends: extendsId, folderPath, ...updateParams } = body

    // Convert to PascalCase and trim
    const displayName = this.toPascalCase(rawDisplayName.trim())
    if (displayName.length < 1) {
      throw new InternalError('Display name must be at least 1 character long.')
    }

    // Check for duplicate display names and throw if duplicate found
    const { model: baseModel } = await this.modelDb.getDtdlModelAndTree(ontologyId)
    const displayNameIdMap = this.getDisplayNameIdMap(baseModel)
    const commonPrefix = this.extractCommonDtmiPrefix(baseModel)
    const newId = `${commonPrefix}:${displayName};1`

    if (Object.values(displayNameIdMap).includes(newId)) {
      throw new InternalError(
        `Please update the display name '${displayName}' as its ID already exists in the ontology. You can change it again after creation.`
      )
    }

    const newNode = {
      '@id': newId,
      '@type': 'Interface',
      '@context': 'dtmi:dtdl:context;4',
      displayName: displayName,
      description: description ? description : undefined,
      comment: comment ? comment : undefined,
      extends: extendsId ? [extendsId] : [],
      contents: [],
    } as NullableDtdlSource

    const stringJson = JSON.stringify(newNode, null, 2)
    const fileName = folderPath ? `${folderPath}/${displayName}.json` : `${displayName}.json`
    await this.modelDb.parseWithUpdatedFiles(ontologyId, [{ id: newId, source: newNode }])
    await this.modelDb.addEntityToModel(ontologyId, stringJson, fileName)

    this.cache.clear()
    this.sessionStore.update(updateParams.sessionId, {
      highlightNodeId: dtdlIdReplaceSemicolon(newId),
      search: undefined,
    })
    return this.ontologyController.updateLayout(req, ontologyId, updateParams)
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

    const extendedBys = this.getExtendedBy(model, entityId)

    const query = {
      entityKind: entity.EntityKind as DeletableEntities,
      definedIn: entity.DefinedIn ?? entityId,
      contentName: isNamedEntity(entity) ? entity.name : '',
      displayName: getDisplayName(entity),
      definedInDisplayName: definedIn !== entityId ? getDisplayName(model[definedIn]) : undefined,
      extendedBys: extendedBys.map((e) => getDisplayName(model[e])),
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
    await this.modelDb.updateDtdlSource(id, updatedSource)

    this.cache.clear()
  }

  deleteInterfaces = async (ontologyId: UUID, interfaceIds: DtdlId[]) => {
    const trackChanges = new Map<UUID, { id: UUID; source: NullableDtdlSource }>() // track source updates in case same source updated multiple times
    for (const interfaceId of interfaceIds) {
      const { id, source } = await this.modelDb.getDtdlSourceByInterfaceId(ontologyId, interfaceId)
      const alreadyUpdated = trackChanges.get(id)
      const updatedSource = alreadyUpdated
        ? deleteInterface(interfaceId, alreadyUpdated.source)
        : deleteInterface(interfaceId, source)
      trackChanges.set(id, { id, source: updatedSource })
    }
    const updates = Array.from(trackChanges.values())
    await this.modelDb.parseWithUpdatedFiles(ontologyId, updates)

    await this.modelDb.deleteOrUpdateDtdlSource(updates)

    this.cache.clear()
  }

  getExtendedBy = (model: DtdlObjectModel, entityId: DtdlId, visited = new Set<DtdlId>()): DtdlId[] => {
    if (visited.has(entityId)) throw new Error('Circular reference in extended bys')

    visited.add(entityId)
    const entity = model[entityId]
    if (!isInterface(entity)) return []
    return entity.extendedBy.flatMap((e) => [e, ...this.getExtendedBy(model, e, visited)])
  }

  private getDisplayNameIdMap(model: DtdlObjectModel): Record<string, string> {
    return Object.fromEntries(
      Object.entries(model)
        .filter(([, node]) => isInterface(node))
        .map(([id, node]) => {
          const displayName = getDisplayName(node)
          return [displayName, id]
        })
        .filter(([displayName]) => displayName)
    )
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase()).replace(/\s+/g, '')
  }

  private filterDirectoriesOnly(tree: any[]): any[] {
    return tree
      .filter((node) => node.type === 'directory')
      .map((node) => ({
        ...node,
        // Recurse; if no children or only files, children become []
        entries: node.entries ? this.filterDirectoriesOnly(node.entries) : [],
      }))
  }

  private extractCommonDtmiPrefix(model: DtdlObjectModel): string {
    const interfaceIds = Object.entries(model)
      .filter(([, node]) => node.EntityKind === 'Interface')
      .map(([id]) => id)

    if (interfaceIds.length === 0) {
      // Fallback to simple valid DTMI if no interfaces exist
      return 'dtmi:user'
    }

    // Find common prefix by comparing all interface IDs
    let commonPrefix = interfaceIds[0]

    for (let i = 1; i < interfaceIds.length; i++) {
      const currentId = interfaceIds[i]
      let j = 0

      // Find common characters from the start
      while (j < commonPrefix.length && j < currentId.length && commonPrefix[j] === currentId[j]) {
        j++
      }

      commonPrefix = commonPrefix.substring(0, j)
    }

    // Ensure we end before a colon or semicolon
    // Remove any partial segment at the end
    const lastColonIndex = commonPrefix.lastIndexOf(':')
    const lastSemicolonIndex = commonPrefix.lastIndexOf(';')
    const lastValidSeparator = Math.max(lastColonIndex, lastSemicolonIndex)

    if (lastValidSeparator > 0) {
      commonPrefix = commonPrefix.substring(0, lastValidSeparator + 1)
    } else if (commonPrefix.startsWith('dtmi:')) {
      // At minimum keep 'dtmi:'
      commonPrefix = 'dtmi:'
    } else {
      // Fallback if no valid DTMI structure found
      commonPrefix = 'dtmi:user:'
    }

    // Remove trailing colon
    if (commonPrefix.endsWith(':')) {
      commonPrefix = commonPrefix.slice(0, -1)
    }

    return commonPrefix
  }
}
