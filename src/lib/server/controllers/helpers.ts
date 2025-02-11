import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import Database from '../../db'
import { ILogger } from '../logger'
import { CookieHistoryParams } from '../models/controllerTypes'
import { RecentFile } from '../models/openTypes'

const formatLastVisited = (timestamp: number): string => {
  const date = new Date(timestamp)
  if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `Yesterday at ${format(date, 'HH:mm')}`
  return `${formatDistanceToNow(date, { addSuffix: true })}`
}

export const recentFilesFromCookies = async (
  cookies: Record<string, CookieHistoryParams[]>,
  db: Database,
  logger: ILogger
) => {
  const cookieName = 'DTDL_MODEL_HISTORY'
  const cookieHistory: CookieHistoryParams[] = cookies[cookieName] ? cookies[cookieName] : []
  const models = await Promise.all(
    cookieHistory.flatMap(async (entry) => {
      try {
        const model = (await db.get('model', { id: entry.id }, 1))[0]
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
