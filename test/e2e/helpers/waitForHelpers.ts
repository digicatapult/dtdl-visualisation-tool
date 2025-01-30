import { Page } from '@playwright/test'

export const waitForUpdateLayout = async <T>(page: Page, action: () => Promise<T>) => {
    const updateLayoutResponse = page.waitForResponse(
        (resp) => resp.url().includes('/update-layout') && resp.status() === 200
    )
    await action()
    await updateLayoutResponse
}

export const waitForSuccessResponse = async <T>(page: Page, action: () => Promise<T>, includeRoute: string) => {
    const response = page.waitForResponse((resp) => resp.url().includes(includeRoute) && resp.status() === 200)
    await action()
    await response
}

export async function waitForUploadFile<T>(page: Page, action: () => Promise<T>, filePath: string) {
    const fileChooserPromise = page.waitForEvent('filechooser')
    await action()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(filePath)
}
