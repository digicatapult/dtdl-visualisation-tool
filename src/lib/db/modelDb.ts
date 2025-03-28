import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { singleton } from 'tsyringe'
import { InternalError } from '../server/errors.js'
import { FileSourceKeys } from '../server/models/openTypes.js'
import { DtdlId, type UUID } from '../server/models/strings.js'
import { allInterfaceFilter } from '../server/utils/dtdl/extract.js'
import Parser from '../server/utils/dtdl/parser.js'
import Database from './index.js'
import { DtdlFile, DtdlRow, ModelRow } from './types.js'

@singleton()
export class ModelDb {
  constructor(
    private db: Database,
    private parser: Parser
  ) {}

  async getModelById(id: UUID): Promise<ModelRow> {
    const [model] = await this.db.get('model', { id })
    if (!model) throw new InternalError(`Failed to find model: ${id}`)
    return model
  }

  async getDefaultModel(): Promise<ModelRow> {
    const [model] = await this.db.get('model', { source: 'default' })
    return model
  }

  async deleteDefaultModel(): Promise<void> {
    await this.db.delete('model', { source: 'default' })
  }

  async insertModel(
    name: string,
    preview: string,
    source: FileSourceKeys,
    owner: string | null,
    repo: string | null,
    files: DtdlFile[]
  ): Promise<UUID> {
    return this.db.withTransaction(async (db) => {
      const [{ id }] = await db.insert('model', {
        name,
        preview,
        source,
        owner,
        repo,
      })

      for (const file of files) {
        await db.insert('dtdl', { ...file, model_id: id })
      }
      return id
    })
  }

  async getDtdlModel(id: UUID): Promise<DtdlObjectModel> {
    const files = await this.db.get('dtdl', { model_id: id })
    if (files.length === 0) throw new InternalError(`Failed to find model: ${id}`)
    const filesStringified = files.map((file) => ({ path: file.path, contents: JSON.stringify(file.contents) }))
    const parsedDtdl = await this.parser.parse(filesStringified)
    return parsedDtdl
  }

  // validate the updated file works with rest of model
  async parseWithUpdatedFile(model_id: UUID, updateId: UUID, updateContents: string) {
    const files = await this.db.get('dtdl', { model_id })
    if (files.length === 0) throw new InternalError(`Failed to find model: ${model_id}`)
    const filesStringified = files.map((file) => {
      if (file.id === updateId) {
        return { path: file.path, contents: updateContents }
      }
      return { path: file.path, contents: JSON.stringify(file.contents) }
    })

    const parsedDtdl = await this.parser.parse(filesStringified)
    return parsedDtdl
  }

  // collection for searching
  getCollection(dtdlModel: DtdlObjectModel) {
    return Object.entries(dtdlModel)
      .filter(allInterfaceFilter)
      .map(([, entity]) => entity)
  }

  async getDtdlByEntityId(model_id: UUID, entityId: DtdlId): Promise<DtdlRow> {
    const [dtdl] = await this.db.getJsonb(
      'dtdl',
      'jsonb_path_exists',
      'contents',
      // filter root of json ($), recursively (**), for the (@id) field where (?) it matches (@ == ??) entity id (prepared statement)
      // recursive is required because DTDL can be a single entity or an array of entities (multiple IDs in one file)
      `$.**."@id" \\? (@ == ??)`,
      [entityId],
      {
        model_id,
      }
    )
    if (!dtdl) throw new InternalError(`Failed to find dtdl containing @id: ${entityId} for model: ${model_id}`)
    return dtdl
  }

  async updateDtdlContents(id: UUID, contents: string): Promise<DtdlRow> {
    const [dtdl] = await this.db.update('dtdl', { id }, { contents })
    if (!dtdl) throw new InternalError(`Failed to find dtdl: ${id}`)
    return dtdl
  }
}
