import { Page } from '@playwright/test'

export const waitForUpdateLayout = async <T>(page: Page, action: () => Promise<T>) => {
  return waitForSuccessResponse(page, action, '/update-layout')
}

export const waitForSuccessResponse = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
  const response = page.waitForResponse((resp) => {
    const acceptableStatuses = new Set([200, 201, 204, 302, 304])

    // Only validate the response if it matches our expected route
    if (resp.url().includes(includeRoute)) {
      if (!acceptableStatuses.has(resp.status())) {
        throw new Error(`Caught bad request to '${resp.url()}' failed with: ${resp.status()}`)
      }
      return true
    }

    // Ignore responses that don't match our route
    return false
  })
  await action()
  await response
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
