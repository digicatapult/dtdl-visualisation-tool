import dotenv from 'dotenv'
import * as envalid from 'envalid'
import { singleton } from 'tsyringe'
import { strArrayValidator } from './validators.js'

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })
  dotenv.config({ override: true })
} else {
  dotenv.config()
}

export const envConfig = {
  LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
  CACHE_TTL: envalid.num({ default: 1000 * 60 * 5 }),
  CACHE_SIZE: envalid.num({ default: 100 }),
  SEARCH_THRESHOLD: envalid.num({ default: 0.4 }),
  DB_HOST: envalid.host({ default: 'localhost' }),
  DB_NAME: envalid.str({ default: 'dtdl-visualisation-tool' }),
  DB_USERNAME: envalid.str({ default: 'postgres' }),
  DB_PASSWORD: envalid.str({ default: 'postgres' }),
  DB_PORT: envalid.port({ default: 5432 }),
  COOKIE_SESSION_KEYS: strArrayValidator({ devDefault: ['secret'] }),
  GH_APP_NAME: envalid.str(),
  GH_CLIENT_ID: envalid.str(),
  GH_CLIENT_SECRET: envalid.str(),
  GH_PER_PAGE: envalid.num({ default: 50 }),
  UPLOAD_LIMIT_MB: envalid.num({ default: 10 }),
  GH_REDIRECT_ORIGIN: envalid.str({ default: 'http://localhost:3000' }),
  PUPPETEER_ARGS: strArrayValidator({ default: [''] }),
  EDIT_ONTOLOGY: envalid.bool({ default: false, devDefault: true }),
  JSON_DEPTH_LIMIT: envalid.num({ default: 10 }),
  STRICT_RATE_LIMIT: envalid.num({ default: 1000 }),
  GLOBAL_RATE_LIMIT: envalid.num({ default: 10000 }),
  IP_ALLOW_LIST: strArrayValidator({ default: [''] }),
  RATE_LIMIT_WINDOW_MS: envalid.num({ default: 10 * 60 * 1000 }),
  MAX_DTDL_OBJECT_SIZE: envalid.num({ default: 1000 }),
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
