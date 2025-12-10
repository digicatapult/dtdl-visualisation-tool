import { expect, Page, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openEditRepo } from './helpers/openEditRepo.js'
import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('Test edit ontology', () => {
  test('open ontology that cant be edited and check that toggle is disabled', async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto(baseURL!))
    await expect(page.locator('#toolbar').getByText('Open')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByText('Viewed Today at ')).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('.file-card').first().click(), '/view')
    await expect(page.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()

    expect(await page.locator('#edit-toggle .switch').isEnabled()).toBeFalsy()

    expect(await page.locator('#edit-toggle').getAttribute('title')).toBe(
      'Only Ontologies from github that you have write permissions on, can be edited'
    )
  })
  test('edit interface + relationship', async ({ browser, baseURL }) => {
    test.setTimeout(110000)
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // turn on edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // assert editing styling
    const border = await getStyledComponent(page, '#mermaid-wrapper', '::before', 'border')
    expect(border).toBe('5px solid rgb(0, 183, 155)')

    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText('displayNameEdit', { exact: true }).first().click(),
      '/update-layout'
    )

    // interface edits
    const newInterfaceDisplayName = 'new display name'
    await testNavPanelEdit(page, /^displayNameEdit$/, newInterfaceDisplayName, '/displayName')
    await testNavPanelEdit(page, /^descriptionEdit$/, 'updated', '/description')
    await testNavPanelEdit(page, /^commentEdit$/, 'updated', '/comment')

    // property edits
    await testNavPanelEdit(page, /^propertyDisplayNameEdit$/, 'updated', '/propertyDisplayName')
    await testNavPanelDropdownEdit(page, 'float', 'integer', '/propertySchema')
    await testNavPanelEdit(page, /^propertyDescriptionEdit$/, 'updated', '/propertyDescription')
    await testNavPanelEdit(page, /^propertyCommentEdit$/, 'updated', '/propertyComment')
    await testNavPanelDropdownEdit(page, 'false', 'true', '/propertyWritable')

    // extended property
    const extendedProperty = page.locator('#navigation-panel-details').getByText('Name: baseProperty')
    const backgroundColor = await extendedProperty.evaluate((el) => window.getComputedStyle(el).backgroundColor)
    expect(backgroundColor).toBe('rgb(245, 245, 245)') // #f5f5f5 - matches inherited relationship styling
    await expect(extendedProperty).toHaveAttribute('title', 'Extended from dtmi:com:base;1')

    // telemetry edits
    await testNavPanelEdit(page, /^telemetryDisplayNameEdit$/, 'updated', '/telemetryDisplayName')
    await testNavPanelDropdownEdit(page, 'float', 'integer', '/telemetrySchema')
    await testNavPanelEdit(page, /^telemetryDescriptionEdit$/, 'updated', '/telemetryDescription')
    await testNavPanelEdit(page, /^telemetryCommentEdit$/, 'updated', '/telemetryComment')

    // command edits
    await testNavPanelEdit(page, /^turnOnCommandDisplayNameEdit$/, 'updated', '/commandDisplayName')
    await testNavPanelEdit(page, /^turnOnCommandDescriptionEdit$/, 'updated', '/commandDescription')
    await testNavPanelEdit(page, /^turnOnCommandCommentEdit$/, 'updated', '/commandComment')
    await testNavPanelEdit(page, /^modeRequestDisplayName$/, 'updated', '/commandRequestDisplayName')
    await testNavPanelEdit(page, /^modeRequestDescription$/, 'updated', '/commandRequestDescription')
    await testNavPanelEdit(page, /^modeRequestComment$/, 'updated', '/commandRequestComment')
    await testNavPanelEdit(page, /^modeResponseDescription$/, 'updated', '/commandResponseDescription')
    await testNavPanelEdit(page, /^modeResponseComment$/, 'updated', '/commandResponseComment')
    await testNavPanelDropdownEdit(page, 'string', 'long', '/commandResponseSchema')

    // relationship edits
    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText('relationshipDisplay').first().click(),
      '/update-layout'
    )
    const newRelationshipDisplayName = 'new rel name'
    await testNavPanelEdit(
      page,
      /^relationshipDisplayNameEdit$/,
      newRelationshipDisplayName,
      '/relationshipDisplayName'
    )
    await testNavPanelEdit(page, /^relationshipDescriptionEdit$/, 'updated', '/relationshipDescription')
    await testNavPanelEdit(page, /^relationshipCommentEdit$/, 'updated', '/relationshipComment')

    // test relationship target editing via dropdown
    // The relationship currently targets dtmi:com:example;1 (which has no displayName, so shows as ID)
    // We'll change it to target the main interface (dtmi:com:edit:contents;1)
    const targetDropdown = page.locator('select.nav-panel-editable').filter({
      has: page.locator('option[selected]:has-text("dtmi:com:example;1")'),
    })
    await expect(targetDropdown).toBeVisible()
    // Get the option that contains the new interface display name and extract its value (the DTDL ID)
    const targetOption = targetDropdown.locator(`option:has-text("${newInterfaceDisplayName}")`).first()
    const targetValue = await targetOption.getAttribute('value')
    expect(targetValue).toBeTruthy()
    // Change the target to the new interface
    await waitForSuccessResponse(page, () => targetDropdown.selectOption(targetValue!), '/relationshipTarget')
    await page.waitForTimeout(500)
    // Verify the edge label updated in the diagram
    await expect(page.locator('#mermaid-output').getByText(newRelationshipDisplayName)).toBeVisible()

    // Click on the interface to view its relationships (including inherited ones)
    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText(newInterfaceDisplayName, { exact: true }).first().click(),
      '/update-layout'
    )

    // test inherited relationship is read-only and has styling
    // Need to scroll down to see the Relationships section which contains inherited relationships
    await page.locator('#navigation-panel-details').evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await page.waitForTimeout(500)

    const inheritedRelationship = page.locator('.inherited-relationship').first()
    await expect(inheritedRelationship).toBeVisible()

    // Check that inherited relationship has gray background
    const inheritedBgColor = await inheritedRelationship.evaluate((el) => window.getComputedStyle(el).backgroundColor)
    expect(inheritedBgColor).toBe('rgb(245, 245, 245)') // #f5f5f5

    // Check that inherited relationship has tooltip
    const tooltipText = await inheritedRelationship.getAttribute('data-tooltip')
    expect(tooltipText).toMatch(/Inherited from.*Target:/)
    // The baseRelationship has no target, so it will show "Unknown" which doesn't contain dtmi:
    expect(tooltipText).toContain('base')

    // Check that inherited relationship display name is read-only (shown as <p>, not editable)
    const inheritedDisplayNameP = inheritedRelationship.locator('p').first()
    await expect(inheritedDisplayNameP).toBeVisible()

    // Verify that no editable textarea exists in inherited relationship
    const inheritedTextarea = inheritedRelationship.locator('textarea.nav-panel-editable')
    await expect(inheritedTextarea).toHaveCount(0)

    // Verify that no editable select exists in inherited relationship (target dropdown should be read-only)
    const inheritedSelect = inheritedRelationship.locator('select.nav-panel-editable')
    await expect(inheritedSelect).toHaveCount(0)

    // search by new interface name
    await page.focus('#search')
    await waitForUpdateLayout(page, () => page.fill('#search', newInterfaceDisplayName))
    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText(newInterfaceDisplayName, { exact: true }).first().click(),
      '/update-layout'
    )

    // turn off edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('View')).toBeVisible()
    await page.locator('#navigation-panel').getByText('Details', { exact: true }).click()

    await page.waitForTimeout(500)

    await expect
      .poll(async () => {
        return getStyledComponent(page, '#navigation-panel h3:first-of-type', '::after', 'content')
      })
      .toBe('none')
  })

  test('delete interface + relationship', async ({ browser }) => {
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // zoom out until visible
    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-out').click()
    }

    // turn on edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // delete relationship
    const relationshipName = 'relationshipDisplayNameEdit'
    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText(relationshipName, { exact: true }).first().click(),
      '/update-layout'
    )

    await waitForSuccessResponse(
      page,
      () => page.locator('#navigation-panel-details').getByText('Delete Relationship', { exact: true }).first().click(),
      '/deleteDialog'
    )

    await expect(page.locator('#delete-button')).toBeDisabled()
    await page.fill('#delete-confirmation', 'delete')
    await expect(page.locator('#delete-button')).toBeEnabled()
    await waitForSuccessResponse(
      page,
      () => page.locator('#delete-dialog').getByRole('button', { name: 'Delete Relationship' }).click(),
      '/content'
    )
    await expect(page.locator('#mermaid-output')).not.toContainText(relationshipName)

    // delete interface
    const baseInterface = 'dtmi:com:base;1'
    const extendedInterface = 'displayNameEdit'
    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText(baseInterface, { exact: true }).first().click(),
      '/update-layout'
    )
    await page.locator('#navigation-panel').getByText('Details', { exact: true }).click()

    await waitForSuccessResponse(
      page,
      () => page.locator('#navigation-panel-details').getByText('Delete Interface', { exact: true }).first().click(),
      '/deleteDialog'
    )

    await page.fill('#delete-confirmation', 'delete')
    await waitForSuccessResponse(
      page,
      () => page.locator('#delete-dialog').getByRole('button', { name: 'Delete Interface' }).click(),
      '/entity'
    )
    await expect(page.locator('#mermaid-output')).not.toContainText(baseInterface)
    await expect(page.locator('#mermaid-output')).not.toContainText(extendedInterface)
  })
})

// edit and focus away from textarea to trigger update
const testNavPanelEdit = async (page: Page, textToEdit: RegExp, newValue: string, successRoute: string) => {
  const textArea = page.locator('.nav-panel-editable').getByText(textToEdit)
  await textArea.click()
  await textArea.fill(newValue)
  await page.waitForTimeout(100)

  await waitForSuccessResponse(
    page,
    async () => {
      // Focus on the search input to trigger blur on the textarea reliably across browsers
      await page.focus('#search')
    },
    successRoute
  )
  await page.waitForTimeout(500)
}

const testNavPanelDropdownEdit = async (page: Page, currentValue: string, newOption: string, successRoute: string) => {
  const dropdown = page.locator(`select.nav-panel-editable:has(option[value="${currentValue}"][selected])`).first()
  await waitForSuccessResponse(page, () => dropdown.selectOption(newOption), successRoute)
  await page.waitForTimeout(500)
}

const getStyledComponent = async (page: Page, selector: string, pseudoElement: string, property: string) => {
  await page.waitForSelector(selector)
  return page.evaluate(
    ({ selector, pseudoElement, property }) => {
      const element = document.querySelector(selector)
      const style = element ? window.getComputedStyle(element, pseudoElement) : null
      return style ? style.getPropertyValue(property) : null
    },
    { selector, pseudoElement, property }
  )
}
