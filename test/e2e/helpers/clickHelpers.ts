import { Locator } from '@playwright/test'

// work around <rect> intercepting pointer events in Safari
export const directlyClickElement = async (locator: Locator) => {
  await locator.evaluate((el) => {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    })
    el.dispatchEvent(event)
  })
}
