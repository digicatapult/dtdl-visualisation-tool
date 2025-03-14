import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { singleton } from 'tsyringe'
import { InternalError } from '../server/errors.js'
import { FileSourceKeys } from '../server/models/openTypes.js'
import { type UUID } from '../server/models/strings.js'
import { allInterfaceFilter } from '../server/utils/dtdl/extract.js'
import Parser from '../server/utils/dtdl/parser.js'
import Database from './index.js'
import { DtdlFile, ModelRow } from './types.js'

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

    const parsedDtdl = await this.parser.parse(
      files.map((file) => ({ path: file.path, contents: JSON.stringify(file.contents) }))
    )
    return parsedDtdl
  }

  // collection for searching
  getCollection(dtdlModel: DtdlObjectModel) {
    return Object.entries(dtdlModel)
      .filter(allInterfaceFilter)
      .map(([, entity]) => entity)
  }
}
