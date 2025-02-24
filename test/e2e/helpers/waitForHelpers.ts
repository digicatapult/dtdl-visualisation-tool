import { Page } from '@playwright/test'

export const waitForUpdateLayout = async <T>(page: Page, action: () => Promise<T>) => {
  const updateLayoutResponse = page.waitForResponse(
    (resp) => resp.url().includes('/update-layout') && resp.status() === 200
  )
  await action()
  await updateLayoutResponse
}

export const waitForSuccessResponse = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
  const response = page.waitForResponse((resp) => {
    return resp.url().includes(includeRoute) && [200, 204].includes(resp.status())
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
