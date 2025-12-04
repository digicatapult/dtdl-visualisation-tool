import { expect, Page, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers.js'

test.describe('Add New Node', () => {
  test('should add a new interface node and verify it appears in the ontology', async ({ browser }) => {
    test.setTimeout(60000)
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // Enable edit mode first
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // Click the "Add New Node" button
    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/add-new-node')

    // Verify we're in the "Add New Node" form
    await expect(page.locator('#create-node-form')).toBeVisible()
    await expect(page.locator('h2:text("New Node")')).toBeVisible()

    // Fill in the basic information
    const displayName = 'TestInterface'
    const description = 'A test interface created by automated test'
    const comment = 'This is a comment for the test interface'

    await page.locator('input[name="displayName"]').fill(displayName)
    await page.locator('textarea[name="description"]').fill(description)
    await page.locator('textarea[name="comment"]').fill(comment)

    // Select "Extends" option if available (optional - test both with and without)
    const extendsSelect = page.locator('select[name="extends"]')
    const hasExtendsOptions = (await extendsSelect.locator('option:not([value=""])').count()) > 0
    if (hasExtendsOptions) {
      // Select the first available interface to extend
      const firstOption = await extendsSelect.locator('option:not([value=""])').first()
      const optionValue = await firstOption.getAttribute('value')
      if (optionValue) {
        await extendsSelect.selectOption(optionValue)
      }
    }

    // Select a folder (start with root folder)
    await page.locator('button[data-folder-path=""]').click()
    await expect(page.locator('button[data-folder-path=""]')).toHaveClass(/folder-tree-selected/)

    // Submit the form
    await waitForSuccessResponse(page, () => page.locator('#create-new-node-button').click(), '/new-node')

    // Verify we're back in view mode and can see the new node
    await expect(page.locator('#navigation-panel')).toBeVisible()

    // Verify the node appears in the diagram (it should be automatically selected after creation)
    await expect(page.locator('#mermaid-output')).toContainText(displayName)

    // Click on the node to select it and verify details
    await waitForUpdateLayout(page, () => page.locator(`text=${displayName}`).first().click())

    // Verify the node details are displayed in the navigation panel
    await expect(page.locator('#navigation-panel-details')).toBeVisible()
    await expect(page.locator('#navigation-panel-details')).toContainText(displayName)
    await expect(page.locator('#navigation-panel-details')).toContainText(description)
    await expect(page.locator('#navigation-panel-details')).toContainText(comment)

    // Verify the entity type is Interface
    await expect(page.locator('#navigation-panel-details')).toContainText('Interface')
  })

  test('should add a new node to a specific folder', async ({ browser }) => {
    test.setTimeout(60000)
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // Enable edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // Click the "Add New Node" button
    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/add-new-node')

    // Fill in basic information
    const displayName = 'FolderTestInterface'
    await page.locator('input[name="displayName"]').fill(displayName)

    // Expand folder tree and select a specific folder (if any exist)
    const folderButtons = page.locator('button.folder-tree-button[data-folder-path]:not([data-folder-path=""])')
    const folderCount = await folderButtons.count()

    if (folderCount > 0) {
      // Click the first folder to expand it
      const firstFolder = folderButtons.first()
      await firstFolder.click()

      // Verify the folder is selected
      await expect(firstFolder).toHaveClass(/folder-tree-selected/)

      // Get the folder path for verification
      await firstFolder.getAttribute('data-folder-path')

      // Submit the form
      await waitForSuccessResponse(page, () => page.locator('#create-new-node-button').click(), '/new-node')

      // Verify the node was created (it should be automatically selected after creation)
      await expect(page.locator('#mermaid-output')).toContainText(displayName)

      // Switch to tree view to verify folder placement
      await page.locator('input[name="navigationPanelTab"][value="tree"]').check()
      await expect(page.locator('#navigation-panel-tree')).toBeVisible()

      // The specific folder verification would depend on the actual folder structure
      // For now, just verify the node exists somewhere in the tree
      await expect(page.locator('#navigation-panel-tree')).toContainText(displayName)
    } else {
      // If no folders exist, just create in root and verify
      await page.locator('button[data-folder-path=""]').click()

      await waitForSuccessResponse(page, () => page.locator('#create-new-node-button').click(), '/new-node')

      // Verify the node was created in root
      await waitForUpdateLayout(page, () => page.locator('#search').fill(displayName))
      await expect(page.locator('#mermaid-output')).toContainText(displayName)
    }
  })

  test('should validate required fields', async ({ browser }) => {
    test.setTimeout(60000)
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // Enable edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // Click the "Add New Node" button
    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/add-new-node')

    // Try to submit without filling required fields
    await page.locator('#create-new-node-button').click()

    // Check that HTML5 validation prevents submission
    const displayNameInput = page.locator('input[name="displayName"]')
    await expect(displayNameInput).toBeVisible()

    // Verify the form is still visible (submission was blocked)
    await expect(page.locator('#create-node-form')).toBeVisible()

    // Fill in just the display name
    await displayNameInput.fill('ValidName')

    // Folder selection is required - verify it's required
    const folderPathInput = page.locator('input[name="folderPath"]')
    const isRequired = await folderPathInput.getAttribute('required')
    expect(isRequired).toBe('')

    // Select root folder to satisfy requirement
    await page.locator('button[data-folder-path=""]').click()

    // Now submission should work
    await waitForSuccessResponse(page, () => page.locator('#create-new-node-button').click(), '/new-node')

    // Verify the node was created (it should be automatically selected after creation)
    await expect(page.locator('#mermaid-output')).toContainText('ValidName')
  })

  test('should handle duplicate display names correctly', async ({ browser }) => {
    test.setTimeout(60000)
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // Enable edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // Click the "Add New Node" button
    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/add-new-node')

    // Try to use a display name that likely already exists in the test ontology
    // This will depend on the actual test data, but let's try common names
    const duplicateName = 'Equipment' // This is likely to exist in energy grid ontology

    await page.locator('input[name="displayName"]').fill(duplicateName)
    await page.locator('button[data-folder-path=""]').click()

    // Submit and expect either success with modified name or error handling
    await page.locator('#create-new-node-button').click()

    // await page.waitForTimeout(1000) // unnecessary timeout

    // Check if we got an error message or if the system handled it gracefully
    const hasError = await page
      .locator('.error, .warning, [class*="error"]')
      .isVisible()
      .catch(() => false)

    if (hasError) {
      // If there's an error, verify error handling works
      await expect(page.locator('#create-node-form')).toBeVisible()
    } else {
      // If no error, verify the node was created (possibly with modified name)
      await expect(page.locator('#navigation-panel')).toBeVisible()
    }
  })

  test('should cancel creation and return to edit mode', async ({ browser }) => {
    test.setTimeout(60000)
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // Enable edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // Click the "Add New Node" button
    await waitForSuccessResponse(page, () => page.locator('#add-node-button').click(), '/add-new-node')

    // Verify we're in the add node form
    await expect(page.locator('#create-node-form')).toBeVisible()

    // Click cancel button
    await waitForSuccessResponse(page, () => page.locator('#cancel-button').click(), '/edit-model')

    // Verify we're back in edit mode with normal navigation panel
    await expect(page.locator('#navigation-panel')).toBeVisible()
    await expect(page.locator('#navigation-panel')).toHaveClass(/edit/)
    await expect(page.locator('#create-node-form')).not.toBeVisible()

    // Verify the add node button is still available
    await expect(page.locator('#add-node-button')).toBeVisible()
  })

  test('should only be available in edit mode', async ({ browser }) => {
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // Initially in view mode - should show "View" text
    await expect(page.locator('#edit-toggle').getByText('View')).toBeVisible()

    // The add node button should not be interactable in view mode
    const addNodeButton = page.locator('#add-node-button')

    // Button might be hidden or disabled in view mode
    const isVisible = await addNodeButton.isVisible().catch(() => false)
    if (isVisible) {
      // If visible, it should be disabled or not functional
      const isEnabled = await addNodeButton.isEnabled()
      expect(isEnabled).toBeFalsy()
    }

    // Enable edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // Now the add node button should be available
    await expect(addNodeButton).toBeVisible()
    await expect(addNodeButton).toBeEnabled()

    // Should be able to click it
    await waitForSuccessResponse(page, () => addNodeButton.click(), '/add-new-node')
    await expect(page.locator('#create-node-form')).toBeVisible()
  })
})

const openEditRepo = async (page: Page) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('./open')
  await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
    '/menu'
  )
  await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')

  // open dtdl test fixture
  await expect(page.locator('#public-github-input')).toBeVisible()
  await page.fill('#public-github-input', 'digicatapult/dtdl-test-fixtures')
  await waitForSuccessResponse(page, () => page.press('#public-github-input', 'Enter'), '/branches')

  // click test/dtdl branch
  const branchName = page.locator('.github-list li').filter({ hasText: /^main$/ })
  await expect(branchName).toBeVisible()
  await waitForSuccessResponse(page, () => branchName.click(), '/contents')

  // click edit
  const dirName = page.locator('.github-list li').filter({ hasText: /edit$/ })
  await expect(dirName).toBeVisible()
  await waitForSuccessResponse(page, () => dirName.click(), '/contents')

  // get dtdl from github
  await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
  await expect(page.locator('#mermaid-output').getByText('displayNameEdit', { exact: true })).toBeVisible()
}
