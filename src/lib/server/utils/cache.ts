import { z } from 'zod'

export const Cache = Symbol('Cache')

export interface ICache {
  get<T>(key: string, parser: z.ZodType<T>): T | undefined
  set<T>(key: string, value: T): void
  has(key: string): boolean
  clear(): void
  size(): number
}
