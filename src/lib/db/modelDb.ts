import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { singleton } from 'tsyringe'
import { InternalError } from '../server/errors.js'
import { FileSourceKeys } from '../server/models/openTypes.js'
import { DtdlId, type UUID } from '../server/models/strings.js'
import { allInterfaceFilter } from '../server/utils/dtdl/extract.js'
import Parser, { DtdlPath } from '../server/utils/dtdl/parser.js'
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
      const [{ id: modelId }] = await db.insert('model', {
        name,
        preview,
        source,
        owner,
        repo,
      })

      for (const file of files) {
        const [{ id: dtdlId }] = await db.insert('dtdl', {
          path: file.path,
          contents: file.contents,
          model_id: modelId,
        })
        for (const error of file.errors ?? []) {
          // Ensure the error matches the expected schema (e.g., serialize or map fields as needed)
          await db.insert('dtdl_error', { error: JSON.parse(JSON.stringify(error)), dtdl_id: dtdlId })
        }
      }
      return modelId
    })
  }

  async getDtdlFiles(model_id: UUID): Promise<DtdlFile[]> {
    const files = await this.db.get('dtdl', { model_id })
    if (files.length === 0) throw new InternalError(`Failed to find model: ${model_id}`)

    return Promise.all(
      files.map(async (file) => {
        const errorRows = await this.db.get('dtdl_error', { dtdl_id: file.id })
        const errors = errorRows.map(({ error }) => error)
        return {
          path: file.path,
          contents: JSON.stringify(file.contents),
          ...(errors.length > 0 && { errors }),
        }
      })
    )
  }

  async getDtdlModelAndTree(id: UUID): Promise<{ model: DtdlObjectModel; fileTree: DtdlPath[] }> {
    const files = await this.getDtdlFiles(id)
    const parsedDtdl = await this.parser.parseAll(files)
    const fileTree = this.parser.extractDtdlPaths(files, parsedDtdl)
    return { model: parsedDtdl, fileTree }
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

    const parsedDtdl = await this.parser.parseAll(filesStringified)
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
