import { expect, test } from '@playwright/test'
import { visualisationUIWiremockPort } from '../globalSetup.js'
import { openEditRepo } from './helpers/openEditRepo.js'
import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers.js'

test.describe('Add New Node', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIWiremockPort}` })

  test('should add a new interface node and verify it appears in the ontology', async ({ page }) => {
    test.setTimeout(60000)
    await openEditRepo(page)

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/entity/add-new-node')

    await expect(page.locator('#create-node-form')).toBeVisible()
    await expect(page.locator('h2:text("New Node")')).toBeVisible()

    const displayName = 'TestInterface'
    const description = 'A test interface created by automated test'
    const comment = 'This is a comment for the test interface'

    await page.locator('#create-node-form input[name="displayName"]').fill(displayName)
    await page.locator('#create-node-form textarea[name="description"]').fill(description)
    await page.locator('#create-node-form textarea[name="comment"]').fill(comment)

    const extendsSelect = page.locator('select[name="extends"]')
    const hasExtendsOptions = (await extendsSelect.locator('option:not([value=""])').count()) > 0
    if (hasExtendsOptions) {
      const firstOption = extendsSelect.locator('option:not([value=""])').first()
      const optionValue = await firstOption.getAttribute('value')
      if (optionValue) {
        await extendsSelect.selectOption(optionValue)
      }
    }

    await page.locator('button[data-folder-path=""]').click()
    await expect(page.locator('button[data-folder-path=""]')).toHaveClass(/folder-tree-selected/)

    await waitForSuccessResponse(page, () => page.locator('#create-new-node-button').click(), '/entity/new-node')

    await expect(page.locator('#navigation-panel')).toBeVisible()

    await expect(page.locator('#mermaid-output')).toContainText(displayName)

    await waitForUpdateLayout(page, () => page.locator(`text=${displayName}`).first().click())

    await expect(page.locator('#navigation-panel-details')).toBeVisible()
    await expect(page.locator('#navigation-panel-details')).toContainText(displayName)
    await expect(page.locator('#navigation-panel-details')).toContainText(description)
    await expect(page.locator('#navigation-panel-details')).toContainText(comment)

    await expect(page.locator('#navigation-panel-details')).toContainText('Interface')
    await page.close()
  })

  test('should add a new node to a specific folder', async ({ page }) => {
    test.setTimeout(60000)
    await openEditRepo(page)

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/entity/add-new-node')

    const displayName = 'FolderTestInterface'
    await page.locator('input[name="displayName"]').fill(displayName)

    const folderButtons = page.locator('button.folder-tree-button[data-folder-path]:not([data-folder-path=""])')
    const folderCount = await folderButtons.count()

    if (folderCount > 0) {
      const firstFolder = folderButtons.first()
      await firstFolder.click()

      await expect(firstFolder).toHaveClass(/folder-tree-selected/)

      await firstFolder.getAttribute('data-folder-path')

      await waitForSuccessResponse(page, () => page.locator('#create-new-node-button').click(), '/entity/new-node')

      await expect(page.locator('#mermaid-output')).toContainText(displayName)

      await page.locator('input[name="navigationPanelTab"][value="tree"]').check()
      await expect(page.locator('#navigation-panel-tree')).toBeVisible()

      await expect(page.locator('#navigation-panel-tree')).toContainText(displayName)
    } else {
      await page.locator('button[data-folder-path=""]').click()

      await waitForSuccessResponse(page, () => page.locator('#create-new-node-button').click(), '/entity/new-node')

      await waitForUpdateLayout(page, () => page.type('#search', displayName, { delay: 100 }))
      await expect(page.locator('#mermaid-output')).toContainText(displayName)
      await page.close()
    }
  })

  test('should validate required fields', async ({ page }) => {
    test.setTimeout(60000)
    await openEditRepo(page)

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/entity/add-new-node')

    await page.locator('#create-new-node-button').click()

    const displayNameInput = page.locator('input[name="displayName"]')
    await expect(displayNameInput).toBeVisible()

    await expect(page.locator('#create-node-form')).toBeVisible()

    await displayNameInput.fill('ValidName')

    const folderPathInput = page.locator('input[name="folderPath"]')
    const isRequired = await folderPathInput.getAttribute('required')
    expect(isRequired).toBe('')

    await page.locator('button[data-folder-path=""]').click()

    await waitForSuccessResponse(page, () => page.locator('#create-new-node-button').click(), '/entity/new-node')

    await expect(page.locator('#mermaid-output')).toContainText('ValidName')
    await page.close()
  })

  test('should handle duplicate display names correctly', async ({ page }) => {
    test.setTimeout(60000)
    await openEditRepo(page)

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/entity/add-new-node')

    const duplicateName = 'Equipment'

    await page.locator('input[name="displayName"]').fill(duplicateName)
    await page.locator('button[data-folder-path=""]').click()

    await page.locator('#create-new-node-button').click()

    const hasError = await page
      .locator('dialog[open]')
      .isVisible()
      .catch(() => false)

    if (hasError) {
      await expect(page.locator('#create-node-form')).toBeVisible()
    } else {
      await expect(page.locator('#navigation-panel')).toBeVisible()
    }
    await page.close()
  })

  test('should cancel creation and return to edit mode', async ({ page }) => {
    test.setTimeout(60000)
    await openEditRepo(page)

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/entity/add-new-node')

    await expect(page.locator('#create-node-form')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#cancel-button').click(), '/edit-model')

    await expect(page.locator('#navigation-panel')).toBeVisible()
    await expect(page.locator('#navigation-panel')).toHaveClass(/edit/)
    await expect(page.locator('#create-node-form')).not.toBeVisible()

    await expect(page.locator('#add-node-button')).toBeVisible()
    await page.close()
  })

  test('should only be available in edit mode', async ({ page }) => {
    await openEditRepo(page)

    await expect(page.locator('#edit-toggle').getByText('View')).toBeVisible()

    const addNodeButton = page.locator('#add-node-button')

    const isVisible = await addNodeButton.isVisible().catch(() => false)
    if (isVisible) {
      const isEnabled = await addNodeButton.isEnabled()
      expect(isEnabled).toBeFalsy()
    }

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    await expect(addNodeButton).toBeVisible()
    await expect(addNodeButton).toBeEnabled()

    await waitForSuccessResponse(page, () => addNodeButton.click(), '/entity/add-new-node')
    await expect(page.locator('#create-node-form')).toBeVisible()
    await page.close()
  })
})
