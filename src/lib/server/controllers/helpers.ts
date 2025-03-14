import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { ModelDb } from '../../db/modelDb'
import { ILogger } from '../logger'
import { CookieHistoryParams, GenerateParams, relevantParams } from '../models/controllerTypes.js'
import { modelHistoryCookie } from '../models/cookieNames.js'
import { RecentFile } from '../models/openTypes.js'
import { MermaidSvgRender, PlainTextRender } from '../models/renderedDiagram'
import { UUID } from '../models/strings'
import { ICache } from '../utils/cache'

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
        logger.warn(`Failed to fetch model for ID ${entry.id}`, error)
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
