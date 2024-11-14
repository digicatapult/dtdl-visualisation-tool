import { LRUCache } from 'lru-cache'

export const cache = new LRUCache<string, string>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
})

// export type ICache = typeof cache
export const Cache = Symbol('Cache')

export interface ICache {
  get(key: string): string | undefined
  set(key: string, value: string): void
  has(key: string): boolean
  clear(): void
}
