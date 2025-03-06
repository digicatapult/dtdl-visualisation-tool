import { InternalError } from '../server/errors.js'
import { type UUID } from '../server/models/strings.js'
import Database from './index.js'

export class ModelDb {
  constructor(private db: Database) {}

  async getModelById(id: UUID) {
    const [model] = await this.db.get('model', { id })
    if (!model) throw new InternalError(`Failed to find model: ${id}`)
    return model
  }

  async getDefaultModel() {
    const [model] = await this.db.get('model', { source: 'default' })
    if (!model) throw new InternalError(`Failed to find default model`)
    return model
  }

  // Add more data access methods as needed
}
