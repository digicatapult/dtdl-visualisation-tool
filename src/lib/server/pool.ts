import os from 'node:os'
export const pool = os.cpus().length > 3 ? os.cpus().length - 2 : 1

export const Pool = Symbol('Pool')
export type IPool = number
