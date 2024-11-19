export const Cache = Symbol('Cache')

export interface ICache {
  get(key: string): string | undefined
  set(key: string, value: string): void
  has(key: string): boolean
  clear(): void
  size(): number
}
