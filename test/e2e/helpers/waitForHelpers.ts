import { expect, Page } from '@playwright/test'

export const waitForUpdateLayout = async <T>(page: Page, action: () => Promise<T>) => {
  return waitForSuccessResponse(page, action, '/update-layout')
}

export async function htmxReady(page: Page, timeout = 15000) {
  // Wait until there are no in-flight or settling HTMX operations
  const state = page.locator('.htmx-request, .htmx-settling, .htmx-swapping, .htmx-added')
  await expect(state).toHaveCount(0, { timeout })
}

export async function ensureHtmxInitialized(page: Page) {
  const htmx = await page.evaluate('window.htmx')
  if (!htmx) throw new Error('window.htmx not initialized')
}

export const waitForSuccessResponse = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
  await ensureHtmxInitialized(page).catch(() => {})
  await htmxReady(page).catch(() => {})
  const response = page.waitForResponse((resp) => {
    const acceptableStatuses = new Set([200, 204, 302, 304])
    if (!acceptableStatuses.has(resp.status())) {
      throw new Error(`Caught bad request to '${resp.url()}' failed with: ${resp.status()}`)
    }

    return resp.url().includes(includeRoute) && resp.status() === 200
  })
  await action()
  await response
  await htmxReady(page).catch(() => {})
}

export async function waitForUploadFile<T>(page: Page, action: () => Promise<T>, filePath: string | string[]) {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await action()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(filePath)
}

export async function waitForUploadFileFromRoot<T>(page: Page, action: () => Promise<T>, filePath: string) {
  await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
    '/menu'
  )

  await waitForUploadFile(page, action, filePath)
}

export const waitFor404Response = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
  const response = page.waitForResponse((resp) => {
    return resp.url().includes(includeRoute) && resp.status() === 404
  })
  await action()
  await response
}
