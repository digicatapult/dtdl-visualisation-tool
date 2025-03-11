import { Page } from '@playwright/test'

export const waitForUpdateLayout = async <T>(page: Page, action: () => Promise<T>) => {
  return waitForSuccessResponse(page, action, '/update-layout')
}

export const waitForSuccessResponse = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
  const response = page.waitForResponse((resp) => {
    const acceptableStatuses = new Set([200, 204, 302, 304])
    if (!acceptableStatuses.has(resp.status())) {
      throw new Error(`Caught bad request to '${resp.url()}' failed with: ${resp.status()}`)
    }

    return resp.url().includes(includeRoute) && resp.status() === 200
  })
  await action()
  await response
}

export async function waitForUploadFile<T>(page: Page, action: () => Promise<T>, filePath: string) {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await action()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(filePath)
}

export async function waitForUploadFileFromRoot<T>(page: Page, action: () => Promise<T>, filePath: string) {
  await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')

  await waitForUploadFile(page, action, filePath)
}
