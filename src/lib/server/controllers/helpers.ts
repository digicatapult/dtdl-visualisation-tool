import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import express from 'express'
import { container } from 'tsyringe'
import { ModelDb } from '../../db/modelDb.js'
import { InternalError, UnauthorisedError } from '../errors.js'
import { ILogger } from '../logger'
import { CookieHistoryParams, GenerateParams, relevantParams } from '../models/controllerTypes.js'
import { modelHistoryCookie, octokitTokenCookie } from '../models/cookieNames.js'
import { RecentFile } from '../models/openTypes.js'
import { MermaidSvgRender, PlainTextRender } from '../models/renderedDiagram'
import { UUID } from '../models/strings.js'
import { ICache } from '../utils/cache.js'
import { DtdlPath } from '../utils/dtdl/parser.js'
import { authRedirectURL, GithubRequest } from '../utils/githubRequest.js'

const formatLastVisited = (timestamp: number): string => {
  const date = new Date(timestamp)
  if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `Yesterday at ${format(date, 'HH:mm')}`
  return `${formatDistanceToNow(date, { addSuffix: true })}`
}

export const recentFilesFromCookies = async (
  modelDb: ModelDb,
  cookies: Record<string, CookieHistoryParams[]>,
  logger: ILogger
) => {
  const cookieHistory: CookieHistoryParams[] = cookies[modelHistoryCookie] ? cookies[modelHistoryCookie] : []
  const models = await Promise.all(
    cookieHistory.flatMap(async (entry) => {
      try {
        const model = await modelDb.getModelById(entry.id)
        return model || null
      } catch (error) {
        logger.warn(error, `Failed to fetch model for ID ${entry.id}`)
        return null
      }
    })
  )
  const validModels = models.filter((model) => model !== null)
  const recentFiles: RecentFile[] = validModels
    .map((validModel) => {
      const svgElement = validModel.preview ? validModel.preview : 'No Preview'
      const historyEntry = cookieHistory.find((entry) => entry.id === validModel.id)
      const timestamp = historyEntry?.timestamp ?? 0
      return {
        fileName: validModel.name,
        lastVisited: historyEntry ? formatLastVisited(timestamp) : 'Unknown',
        preview: svgElement,
        dtdlModelId: validModel.id,
        rawTimestamp: timestamp,
      }
    })
    .sort((a, b) => b.rawTimestamp - a.rawTimestamp)
    .map(({ rawTimestamp, ...recentFile }) => recentFile)
  return recentFiles
}
export const dtdlCacheKey = (dtdlModelId: UUID, queryParams?: GenerateParams): string => {
  const searchParams = new URLSearchParams()
  for (const key of relevantParams) {
    const value = queryParams?.[key]
    if (value === undefined) {
      continue
    }

    if (!Array.isArray(value)) {
      searchParams.set(key, value)
      continue
    }
    value.forEach((v) => searchParams.append(key, v))
  }
  searchParams.set('dtdlId', dtdlModelId)

  searchParams.sort()
  return searchParams.toString()
}

export const setCacheWithDefaultParams = (cache: ICache, id: UUID, output: MermaidSvgRender | PlainTextRender) => {
  const defaultParams: GenerateParams = { layout: 'elk', diagramType: 'flowchart', expandedIds: [], search: '' }
  cache.set(dtdlCacheKey(id, defaultParams), output)
}

export const hasFileTreeErrors = (fileTree: DtdlPath[]): boolean => {
  for (const node of fileTree) {
    if (node.type === 'file' && node.errors && node.errors.length > 0) {
      return true
    }
    if (node.type === 'directory' && node.entries) {
      if (hasFileTreeErrors(node.entries)) {
        return true
      }
    }
  }
  return false
}

export const checkEditPermission = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const octokitToken = req.signedCookies[octokitTokenCookie]
  if (!octokitToken) {
    res.status(302)
    const returnUrl = req.originalUrl || req.url
    const redirectUrl = authRedirectURL(returnUrl)
    if (req.headers['hx-request']) {
      res.setHeader('HX-Redirect', redirectUrl)
    } else {
      res.setHeader('Location', redirectUrl)
    }
    res.end()
    return
  }

  const modelDb: ModelDb = container.resolve(ModelDb)
  const githubRequest: GithubRequest = container.resolve(GithubRequest)

  const ontologyId: UUID = req.body?.ontologyId || req.params['ontologyId'] || req.params['dtdlModelId']

  const { owner, repo } = await modelDb.getModelById(ontologyId)
  if (!owner || !repo) {
    throw new InternalError(`owner or repo not found in database for GitHub source`)
  }
  const permission = await githubRequest.getRepoPermissions(octokitToken, owner, repo)
  if (permission !== 'edit') throw new UnauthorisedError('User is unauthorised to make this request')

  const { fileTree } = await modelDb.getDtdlModelAndTree(ontologyId)
  if (hasFileTreeErrors(fileTree)) {
    throw new UnauthorisedError('Cannot edit ontology with errors. Please fix all errors before editing.')
  }

  next()
}
