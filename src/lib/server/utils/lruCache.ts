import { LRUCache as LRU } from 'lru-cache'

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

  get = (key: string): string | undefined => {
    return this.cache.get(key)
  }
  set(key: string, value: string): void {
    this.cache.set(key, value)
  }
  has(key: string): boolean {
    return this.cache.has(key)
  }
  clear(): void {
    this.cache.clear()
  }
}
