import Fuse, { IFuseOptions } from 'fuse.js'
import { ISearch } from './search.js'

const defaultOptions: IFuseOptions<object> = {
  includeScore: true,
  keys: ['Id'],
}

export class FuseSearch<T extends object> implements ISearch<T> {
  private fuse: Fuse<T>

  constructor(collection?: T[], options?: IFuseOptions<object>) {
    this.fuse = new Fuse(collection ?? [], { ...defaultOptions, ...options })
  }

  filter(term: string): T[] {
    const res = this.fuse.search(term)
    return res.map((r) => r.item)
  }

  setCollection(collection: T[]): void {
    return this.fuse.setCollection(collection)
  }
}
