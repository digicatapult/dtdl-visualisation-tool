/**
 * PostHog Mock Server for E2E Testing
 *
 * This mock server captures PostHog events sent from the application
 * and provides an API for tests to query captured events.
 */

import express, { Express, Request, Response } from 'express'
import { Server } from 'http'

import { logger as pinoLogger } from '../../src/lib/server/logger.js'

const logger = pinoLogger.child({ component: 'posthog-mock' })

interface CapturedEvent {
  event: string
  distinctId: string
  properties: Record<string, unknown>
  timestamp?: string
  apiKey?: string
}

const capturedEvents: CapturedEvent[] = []
let server: Server | null = null

/**
 * Obfuscate sensitive fields for logging
 */
const obfuscateForLog = (body: Record<string, unknown>): string => {
  const safeBody = { ...body }

  // Obfuscate API key
  if (typeof safeBody.api_key === 'string') {
    safeBody.api_key = safeBody.api_key.substring(0, 8) + '...'
  }

  // Obfuscate batch events - just show event names and count
  if (Array.isArray(safeBody.batch)) {
    const eventNames = safeBody.batch.map((e: { event?: string }) => e.event || 'unknown')
    safeBody.batch = `[${safeBody.batch.length} events: ${eventNames.join(', ')}]` as unknown as []
  }

  return JSON.stringify(safeBody)
}

const createMockServer = (): Express => {
  const app = express()
  app.use(express.json({ limit: '20mb' }))

  // PostHog batch endpoint - receives multiple events
  app.post('/batch', (req: Request, res: Response) => {
    logger.debug({ body: obfuscateForLog(req.body) }, 'Received /batch request')
    const batch = req.body.batch || []
    for (const event of batch) {
      capturedEvents.push({
        event: event.event,
        distinctId: event.distinct_id || event.distinctId,
        properties: event.properties || {},
        timestamp: event.timestamp,
        apiKey: event.api_key || req.body.api_key,
      })
    }
    res.json({ status: 1 })
  })

  // PostHog capture endpoint - receives single event
  app.post('/capture', (req: Request, res: Response) => {
    logger.debug({ body: obfuscateForLog(req.body) }, 'Received /capture request')
    const event = req.body
    capturedEvents.push({
      event: event.event,
      distinctId: event.distinct_id || event.distinctId,
      properties: event.properties || {},
      timestamp: event.timestamp,
      apiKey: event.api_key,
    })
    res.json({ status: 1 })
  })

  // PostHog capture via GET (used by some clients)
  app.get('/capture', (_req: Request, res: Response) => {
    res.json({ status: 1 })
  })

  // PostHog decide endpoint - required for feature flags
  app.post('/decide', (_req: Request, res: Response) => {
    res.json({
      featureFlags: {},
      featureFlagPayloads: {},
      errorsWhileComputingFlags: false,
    })
  })

  // PostHog e endpoint - used by JS client for events
  app.post('/e', (req: Request, res: Response) => {
    logger.debug({ body: obfuscateForLog(req.body) }, 'Received /e request')
    const event = req.body
    capturedEvents.push({
      event: event.event,
      distinctId: event.distinct_id || event.distinctId || event.$distinct_id,
      properties: event.properties || {},
      timestamp: event.timestamp,
      apiKey: event.api_key,
    })
    res.json({ status: 1 })
  })

  // Test API: get all captured events
  app.get('/test/events', (_req: Request, res: Response) => {
    res.json(capturedEvents)
  })

  // Test API: get events filtered by event name
  app.get('/test/events/:eventName', (req: Request, res: Response) => {
    const filtered = capturedEvents.filter((e) => e.event === req.params.eventName)
    res.json(filtered)
  })

  // Test API: clear all events
  app.post('/test/events/clear', (_req: Request, res: Response) => {
    capturedEvents.length = 0
    res.json({ cleared: true, count: 0 })
  })

  // Test API: get event count
  app.get('/test/events/count', (_req: Request, res: Response) => {
    res.json({ count: capturedEvents.length })
  })

  return app
}

import { POSTHOG_MOCK_PORT } from '../constants.js'

export const startMockPostHogServer = (port = POSTHOG_MOCK_PORT): Promise<Server> => {
  return new Promise((resolve, reject) => {
    const app = createMockServer()
    server = app.listen(port, () => {
      logger.info({ port }, 'PostHog mock server started')
      resolve(server!)
    })
    server.on('error', reject)
  })
}

export const stopMockPostHogServer = (): Promise<void> => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        server = null
        capturedEvents.length = 0
        resolve()
      })
    } else {
      resolve()
    }
  })
}

export const getCapturedEvents = (): CapturedEvent[] => {
  return [...capturedEvents]
}

export const clearCapturedEvents = (): void => {
  capturedEvents.length = 0
}

export const getEventsByName = (eventName: string): CapturedEvent[] => {
  return capturedEvents.filter((e) => e.event === eventName)
}
