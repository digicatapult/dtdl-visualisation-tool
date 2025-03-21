import { z } from 'zod'

export const Cache = Symbol('Cache')

export interface ICache {
  get<T, D extends z.ZodTypeDef = z.ZodTypeDef>(key: string, parser: z.ZodType<T, D, unknown>): T | undefined
  set<T>(key: string, value: T): void
  has(key: string): boolean
  clear(): void
  size(): number
  delete(key: string): boolean
}
