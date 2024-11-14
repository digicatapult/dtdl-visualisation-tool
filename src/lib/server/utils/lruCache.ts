import { LRUCache } from 'lru-cache'
import { ICache } from './cache'

export class lruCache implements ICache {
  private cache: LRUCache<string, string>
}
