import { LRUCache as LRU } from 'lru-cache'

import { z } from 'zod'
import { ICache } from './cache'

export class LRUCache implements ICache {
  private cache: LRU<string, string>

  constructor(max: number, ttl: number) {
    this.cache = new LRU<string, string>({
      max,
      ttl,
      updateAgeOnGet: true,
    })
  }

  get = <T, D extends z.ZodTypeDef = z.ZodTypeDef>(key: string, parser: z.ZodType<T, D, unknown>): T | undefined => {
    const fromCache = this.cache.get(key)
    if (fromCache === undefined) {
      return
    }
    return parser.parse(JSON.parse(fromCache))
  }

  set = <T>(key: string, value: T): void => {
    this.cache.set(key, JSON.stringify(value))
  }

  has = (key: string): boolean => this.cache.has(key)

  clear = (): void => this.cache.clear()

  size = (): number => this.cache.size

  delete = (key: string): boolean => this.cache.delete(key)
}
