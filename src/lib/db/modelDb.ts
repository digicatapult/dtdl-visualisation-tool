import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { singleton } from 'tsyringe'
import { InternalError } from '../server/errors.js'
import { FileSourceKeys } from '../server/models/openTypes.js'
import { type UUID } from '../server/models/strings.js'
import Database from './index.js'
import { ModelRow } from './types.js'

@singleton()
export class ModelDb {
  constructor(private db: Database) {}

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
    parsed: DtdlObjectModel,
    preview: string,
    source: FileSourceKeys,
    owner: string | null,
    repo: string | null
  ): Promise<UUID> {
    const [{ id }] = await this.db.insert('model', {
      name,
      parsed,
      preview,
      source,
      owner,
      repo,
    })

    return id
  }
}
