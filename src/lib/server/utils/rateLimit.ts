import { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { container } from 'tsyringe'
import { Env } from '../env/index.js'
import { TooManyRequestsError } from '../errors.js'

const env = container.resolve(Env)

const allowList = ['193.221.133.170']

const strictLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.get('STRICT_RATE_LIMIT'),
  skip: (req) => allowList.includes(req.ip!),
  handler: (req: Request) => {
    console.log(req.ip)
    throw new TooManyRequestsError('Please try again later.')
  },
})

export const globalLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.get('GLOBAL_RATE_LIMIT'),
  skip: (req) => allowList.includes(req.ip!),
  handler: (req: Request) => {
    console.log(req.ip)
    throw new TooManyRequestsError('Please try again later.')
  },
})

export async function strictLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  strictLimit(req, res, next)
  next()
}
