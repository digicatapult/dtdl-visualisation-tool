import Fuse, { type IFuseOptions } from 'fuse.js'
import { container, singleton } from 'tsyringe'
import { Env } from '../../../lib/server/env/index.js'
import { ISearch } from './search.js'

const env = container.resolve(Env)

const defaultOptions: IFuseOptions<object> = {
  includeScore: true,
  keys: ['Id', 'displayName.en', 'name'],
  threshold: env.get('SEARCH_THRESHOLD'),
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

  setCollection(collection: T[]): void {
    return this.fuse.setCollection(collection)
  }
}
