export interface ISearch<T extends object> {
  filter(term: string): T[]
  setCollection(collection: T[]): void
}
