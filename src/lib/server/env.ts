import * as envalid from 'envalid'
import { singleton } from 'tsyringe'

const envConfig = {
  LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
  CACHE_TTL: envalid.num({ default: 1000 * 60 * 5 }),
  CACHE_SIZE: envalid.num({ default: 100 }),
  SEARCH_THRESHOLD: envalid.num({ default: 0.4 }),
  DB_HOST: envalid.host({ default: 'localhost' }),
  DB_NAME: envalid.str({ default: 'dtdl-visualisation-tool' }),
  DB_USERNAME: envalid.str({ default: 'postgres' }),
  DB_PASSWORD: envalid.str({ default: 'postgres' }),
  DB_PORT: envalid.port({ default: 5432 }),
}

export type ENV_CONFIG = typeof envConfig
export type ENV_KEYS = keyof ENV_CONFIG

@singleton()
export class Env {
  private vals: envalid.CleanedEnv<typeof envConfig>

  constructor() {
    this.vals = envalid.cleanEnv(process.env, envConfig)
  }

  get<K extends ENV_KEYS>(key: K) {
    return this.vals[key]
  }
}
