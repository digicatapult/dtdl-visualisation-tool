import { Page } from '@playwright/test'

export const getValidationMessage = async (page: Page, locator: string) => {
  return await page.locator(locator).evaluate((el: HTMLInputElement) => el.validationMessage)
}
