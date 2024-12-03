import { InterfaceType } from '@digicatapult/dtdl-parser'
import Fuse, { type FuseResultMatch, type IFuseOptions } from 'fuse.js'
import { container, singleton } from 'tsyringe'
import { Env } from '../../../lib/server/env.js'
import { ISearch } from './search.js'

const env = container.resolve(Env)

const defaultOptions: IFuseOptions<object> = {
  includeScore: true,
  includeMatches: true,
  keys: ['Id', 'displayName.en', 'relationships'],
  threshold: env.get('SEARCH_THRESHOLD'),
  getFn: (obj: object, path: string | string[]) => {
    if (path[0] === 'relationships') {
      if (obj['EntityKind'] === 'Interface') {
        const interfaceEntity = obj as InterfaceType
        if (interfaceEntity.relationships) return Object.keys(interfaceEntity.relationships)
      }
    }
    return Fuse.config.getFn(obj, path)
  },
}
@singleton()
export class FuseSearch<T extends object> implements ISearch<T> {
  private fuse: Fuse<T>

  constructor(collection?: T[], options?: IFuseOptions<object>) {
    this.fuse = new Fuse(collection ?? [], { ...defaultOptions, ...options })
  }

  // results are ordered from closest to least closest match
  filter(term: string): T[] {
    return this.fuse.search(term).map((r) => r.item)
  }
  // Additional method for enriched results
  filterWithMatches(term: string): Array<{ item: T; matches: readonly FuseResultMatch[] | undefined }> {
    return this.fuse.search(term).map((result) => ({
      item: result.item,
      matches: result.matches,
    }))
  }

  setCollection(collection: T[]): void {
    return this.fuse.setCollection(collection)
  }
}
