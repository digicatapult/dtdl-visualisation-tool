import express from 'express'
import { Readable } from 'node:stream'

import sinon from 'sinon'
import { posthogIdCookie } from '../../models/cookieNames.js'

export const propertyName = 'someProperty'
export const otherPropertyName = 'someOtherProperty'
export const relationshipName = 'someRelationship'
export const otherRelationshipName = 'someOtherRelationship'
export const telemetryName = 'someTelemetry'
export const otherTelemetryName = 'someOtherTelemetry'
export const commandName = 'someCommand'
export const otherCommandName = 'someOtherCommand'

export const dtdlFileFixture =
  (id: string) =>
  ({
    interfaceUpdate,
    relationshipUpdate,
    propertyUpdate,
    telemetryUpdate,
    commandUpdate,
    commandRequestUpdate,
    commandResponseUpdate,
  }: {
    interfaceUpdate?: Record<string, string>
    relationshipUpdate?: Record<string, string>
    propertyUpdate?: Record<string, string | boolean>
    telemetryUpdate?: Record<string, string>
    commandUpdate?: Record<string, string>
    commandRequestUpdate?: Record<string, string>
    commandResponseUpdate?: Record<string, string>
  }) => ({
    '@context': ['dtmi:dtdl:context;4'],
    '@id': id,
    '@type': 'Interface' as const,
    displayName: 'displayName',
    description: 'description',
    comment: 'comment',
    contents: [
      {
        '@type': 'Property',
        name: propertyName,
        description: 'description',
        comment: 'comment',
        schema: 'double',
        writable: true,
        ...propertyUpdate,
      },
      {
        '@type': 'Property',
        name: otherPropertyName,
      },
      {
        '@type': 'Relationship',
        name: relationshipName,
        comment: 'comment',
        displayName: 'displayName',
        description: 'description',
        ...relationshipUpdate,
      },
      {
        '@type': 'Relationship',
        name: otherRelationshipName,
      },
      {
        '@type': 'Telemetry',
        name: telemetryName,
        schema: 'double',
        comment: 'comment',
        description: 'description',
        displayName: 'displayName',
        ...telemetryUpdate,
      },
      {
        '@type': 'Telemetry',
        name: otherTelemetryName,
        schema: 'string',
      },
      {
        '@type': 'Command',
        name: commandName,
        displayName: 'displayName',
        comment: 'comment',
        description: 'description',
        request: {
          name: 'mode',
          displayName: 'displayName',
          description: 'description',
          comment: 'comment',
          schema: 'string',
          ...(commandRequestUpdate && {
            displayName: commandRequestUpdate.displayName ?? 'displayName',
            description: commandRequestUpdate.description ?? 'description',
            comment: commandRequestUpdate.comment || 'comment',
            schema: commandRequestUpdate.schema || 'string',
          }),
        },
        response: {
          name: 'result',
          displayName: 'displayName',
          description: 'description',
          comment: 'comment',
          schema: 'string',
          ...(commandResponseUpdate && {
            displayName: commandResponseUpdate.displayName ?? 'displayName',
            description: commandResponseUpdate.description ?? 'description',
            comment: commandResponseUpdate.comment || 'comment',
            schema: commandResponseUpdate.schema || 'string',
          }),
        },
        ...commandUpdate,
      },
      {
        '@type': 'Command',
        name: otherCommandName,
        displayName: 'otherDisplayName',
        comment: 'otherComment',
        description: 'otherDescription',
      },
    ],
    ...interfaceUpdate,
  })

export const toHTMLString = async (...streams: Readable[]) => {
  const chunks: Uint8Array[] = []
  for (const stream of streams) {
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array)
    }
  }
  return Buffer.concat(chunks).toString('utf8')
}

export const mockReq = (headers: Record<string, string>, cookies: Record<string, unknown> = {}) => {
  return {
    header: (key: string) => headers[key],
    signedCookies: { [posthogIdCookie]: 'test-posthog-id', ...cookies },
  } as unknown as express.Request
}

export const mockReqWithCookie = (cookie: Record<string, unknown>, headers?: Record<string, string>) => {
  return {
    res: {
      cookie: sinon.spy(),
      setHeader: sinon.spy(),
      statusCode: 200,
      sendStatus: sinon.spy(),
    },
    signedCookies: { [posthogIdCookie]: 'test-posthog-id', ...cookie },
    header: (key: string) => headers?.[key],
    headers,
  } as unknown as express.Request
}
