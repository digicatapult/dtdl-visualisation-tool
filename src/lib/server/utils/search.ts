import { type FuseResultMatch } from 'fuse.js'
export const Search = Symbol('Search')

export interface ISearch<T extends object> {
  filter(term: string): T[]
  filterWithMatches(term: string): Array<{ item: T; matches: readonly FuseResultMatch[] | undefined }>
  setCollection(collection: T[]): void
}
