import { expect, Page, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
    // login to github
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
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

    const navigationAfterContent = await getStyledComponent(
      page,
      '#navigation-panel h3:first-of-type',
      '::after',
      'content'
    )
    expect(navigationAfterContent).toBe(`url("${baseURL}/public/images/pencil.svg")`)

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
    expect(backgroundColor).toBe('rgb(245, 246, 250)')
    await expect(extendedProperty).toHaveAttribute('title', 'Extended from dtmi:com:base;1')

    // telemetry edits
    await testNavPanelEdit(page, /^telemetryDisplayNameEdit$/, 'updated', '/telemetryDisplayName')
    await testNavPanelDropdownEdit(page, 'float', 'integer', '/telemetrySchema')
    await testNavPanelEdit(page, /^telemetryDescriptionEdit$/, 'updated', '/telemetryDescription')
    await testNavPanelEdit(page, /^telemetryCommentEdit$/, 'updated', '/telemetryComment')

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
    const targetDropdown = page.locator('select.nav-panel-editable').filter({
      has: page.locator('option[selected]:has-text("relationshipTargetEdit")'),
    })
    await expect(targetDropdown).toBeVisible()
    // Get the option that contains the new interface display name and extract its value (the DTDL ID)
    const targetOption = targetDropdown.locator(`option:has-text("${newInterfaceDisplayName}")`).first()
    const targetValue = await targetOption.getAttribute('value')
    await expect(targetValue).toBeTruthy()
    // Change the target to the new interface
    await waitForSuccessResponse(page, () => targetDropdown.selectOption(targetValue!), '/relationshipTarget')
    await page.waitForTimeout(500)
    // Verify the edge label updated in the diagram
    await expect(page.locator('#mermaid-output').getByText(newRelationshipDisplayName)).toBeVisible()

    // test inherited relationship is read-only and has styling
    const inheritedRelationship = page.locator('.inherited-relationship').first()
    await expect(inheritedRelationship).toBeVisible()

    // Check that inherited relationship has gray background
    const inheritedBgColor = await inheritedRelationship.evaluate((el) => window.getComputedStyle(el).backgroundColor)
    expect(inheritedBgColor).toBe('rgb(245, 245, 245)') // #f5f5f5

    // Check that inherited relationship has tooltip
    const tooltipText = await inheritedRelationship.getAttribute('data-tooltip')
    expect(tooltipText).toMatch(/Inherited from.*Target:/)
    expect(tooltipText).not.toMatch(/dtmi:/) // Should show display names, not DTDL IDs

    // Check that inherited relationship fields are read-only (no textarea/select, just <p> tags)
    const inheritedDisplayName = inheritedRelationship.locator('p').filter({ hasText: /baseRelationship/ })
    await expect(inheritedDisplayName).toBeVisible()

    // Verify that inherited relationship target is not editable (should be <p>, not <select>)
    const inheritedTargetSection = inheritedRelationship.locator('b:has-text("Target:")').locator('..').locator('p')
    await expect(inheritedTargetSection).toBeVisible()

    // Verify that no textarea exists in inherited relationship (not editable)
    const inheritedTextarea = inheritedRelationship.locator('textarea.nav-panel-editable')
    await expect(inheritedTextarea).toHaveCount(0)

    // search by new interface name
    await page.focus('#search')
    await waitForUpdateLayout(page, () => page.fill('#search', newInterfaceDisplayName))
    await expect(page.locator('#mermaid-output').getByText(newInterfaceDisplayName)).toBeVisible()
    await expect(page.locator('#mermaid-output').getByText(newRelationshipDisplayName)).toBeVisible()

    // turn off edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('View')).toBeVisible()

    await page.waitForTimeout(500)

    const navigationAfterContentNull = await getStyledComponent(
      page,
      '#navigation-panel h3:first-of-type',
      '::after',
      'content'
    )
    expect(navigationAfterContentNull).toBe('none')
  })
})

// edit and focus away from textarea to trigger update
const testNavPanelEdit = async (page: Page, textToEdit: RegExp, newValue: string, successRoute: string) => {
  const textArea = page.locator('.nav-panel-editable').getByText(textToEdit)
  await textArea.fill(newValue)
  await waitForSuccessResponse(page, () => page.mouse.click(0, 0), successRoute)
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
