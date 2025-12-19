import { expect, Locator, Page, test } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { waitForSuccessResponse } from './helpers/waitForHelpers'

test.describe('Test content in ontology', () => {
  test('add, edit and delete content', async ({ browser }) => {
    test.setTimeout(110000)
    const context = await browser.newContext({ storageState: join(tmpdir(), 'user1.json') })
    const page = await context.newPage()
    await openEditRepo(page)

    // turn on edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // Select an interface
    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText('displayNameEdit', { exact: true }).first().click(),
      '/update-layout'
    )

    // Add Property
    const propertyName = 'newProperty'
    const propAccordion = page
      .locator('section.accordion-parent')
      .filter({ has: page.locator('h3 button', { hasText: /^Properties$/ }) })
      .first()
    await propAccordion.locator('.accordion-action button').click()

    const propInput = page.locator('input.add-content-input[name="contentName"]')
    await expect(propInput).toBeVisible()
    await propInput.fill(propertyName)

    // Submit by blurring (clicking away)
    await waitForSuccessResponse(page, () => page.mouse.click(0, 0), '/content')

    // Verify Property Added
    await expect(page.locator('#navigation-panel-details').getByText(`Name: ${propertyName}`)).toBeVisible()

    // Edit Property (even if keys are missing)
    const propSection = page
      .locator('#navigation-panel-details')
      .locator('div', { has: page.getByText(`Name: ${propertyName}`) })

    await testNavPanelEdit(
      page,
      propSection.locator('textarea[name="value"]').nth(0),
      'New Prop Display Name',
      '/propertyDisplayName'
    )

    await testNavPanelDropdownEdit(
      page,
      propSection.locator('select[name="value"]').nth(0),
      'integer',
      '/propertySchema'
    )

    await testNavPanelEdit(
      page,
      propSection.locator('textarea[name="value"]').nth(1),
      'New Prop Description',
      '/propertyDescription'
    )
    // Add Relationship
    const relationshipName = 'newRelationship'
    const relAccordion = page
      .locator('section.accordion-parent')
      .filter({ has: page.locator('h3 button', { hasText: /^Relationships$/ }) })
      .first()

    // Ensure Relationships section is expanded
    const relContent = relAccordion.locator('.accordion-content').first()
    if ((await relContent.getAttribute('aria-hidden')) !== null) {
      await relAccordion.locator('h3 button').click()
    }

    await relAccordion.locator('.accordion-action button').click()

    const relInput = page.locator('input.add-content-input[name="contentName"]')
    await expect(relInput).toBeVisible()
    await relInput.fill(relationshipName)

    await waitForSuccessResponse(page, () => page.mouse.click(0, 0), '/content')

    // Verify Relationship Added
    const newRelSection = page
      .locator('#navigation-panel-details')
      .locator('div', { has: page.getByText(`Name: ${relationshipName}`) })

    // Edit Display Name
    await testNavPanelEdit(
      page,
      newRelSection.locator('textarea[name="value"]').nth(0),
      'New Rel Display Name',
      '/relationshipDisplayName'
    )

    // Edit Target
    await testNavPanelDropdownEdit(
      page,
      newRelSection.locator('select[name="value"]').first(),
      'dtmi:com:base;1',
      '/relationshipTarget'
    )

    // Add Telemetry
    const telemetryName = 'newTelemetry'
    const telAccordion = page
      .locator('section.accordion-parent')
      .filter({ has: page.locator('h3 button', { hasText: /^Telemetries$/ }) })
      .first()

    const telContent = telAccordion.locator('.accordion-content').first()
    if ((await telContent.getAttribute('aria-hidden')) !== null) {
      await telAccordion.locator('h3 button').click()
    }

    await telAccordion.locator('.accordion-action button').click()

    const telInput = page.locator('input.add-content-input[name="contentName"]')
    await expect(telInput).toBeVisible()
    await telInput.fill(telemetryName)

    await waitForSuccessResponse(page, () => page.mouse.click(0, 0), '/content')

    // Verify Telemetry Added
    await expect(page.locator('#navigation-panel-details').getByText(`Name: ${telemetryName}`)).toBeVisible()

    // Edit Telemetry
    const telemetryDisplayNameForm = page
      .locator(`form[hx-vals*='"telemetryName":"${telemetryName}"']`)
      .filter({ has: page.locator('textarea') })
      .first()

    await testNavPanelEdit(
      page,
      telemetryDisplayNameForm.locator('textarea'),
      'New Tel Display Name',
      '/telemetryDisplayName'
    )

    // Schema
    const schemaForm = page
      .locator(`form[hx-vals*='"telemetryName":"${telemetryName}"']`)
      .filter({ has: page.locator('select') })
      .first()
    await testNavPanelDropdownEdit(page, schemaForm.locator('select'), 'double', '/telemetrySchema')

    // Add Command
    const commandName = 'newCommandName'
    const cmdAccordion = page
      .locator('section.accordion-parent')
      .filter({ has: page.locator('h3 button', { hasText: /^Commands$/ }) })
      .first()

    const cmdContent = cmdAccordion.locator('.accordion-content').first()
    if ((await cmdContent.getAttribute('aria-hidden')) !== null) {
      await cmdAccordion.locator('h3 button').click()
    }

    await cmdAccordion.locator('.accordion-action button').click()

    const cmdInput = page.locator('input.add-content-input[name="contentName"]')
    await expect(cmdInput).toBeVisible()
    await cmdInput.fill(commandName)

    await waitForSuccessResponse(page, () => page.mouse.click(0, 0), '/content')

    // Verify Command Added
    // Edit Display Name
    const displayNameForm = page
      .locator(`form[hx-vals*='"commandName":"${commandName}"']`)
      .filter({ has: page.locator('textarea') })
      .first()

    await testNavPanelEdit(page, displayNameForm.locator('textarea'), 'New Cmd Display Name', '/commandDisplayName')

    // Edit Request Schema
    const requestSchemaForm = page.locator(
      `form[hx-put*="commandRequestSchema"][hx-vals*='"commandName":"${commandName}"']`
    )
    await testNavPanelDropdownEdit(page, requestSchemaForm.locator('select'), 'string', '/commandRequestSchema')

    // Delete Property
    await propSection.locator('.trash-icon').nth(1).click()
    await expect(page.locator('#delete-dialog')).toBeVisible()
    await page.fill('#delete-confirmation', 'delete')
    await waitForSuccessResponse(page, () => page.locator('#delete-button').click(), '/content')
    await expect(page.locator('#navigation-panel-details').getByText(`Name: ${propertyName}`)).not.toBeVisible()

    // Delete Relationship
    await newRelSection.locator('.trash-icon').nth(1).click()
    await expect(page.locator('#delete-dialog')).toBeVisible()
    await page.fill('#delete-confirmation', 'delete')
    await waitForSuccessResponse(page, () => page.locator('#delete-button').click(), '/content')
    await expect(page.locator('#navigation-panel-details').getByText(`Name: ${relationshipName}`)).not.toBeVisible()

    // Delete Telemetry
    const newTelSection = page
      .locator('#navigation-panel-details')
      .locator('div', { has: page.getByText(`Name: ${telemetryName}`) })
    await newTelSection.locator('.trash-icon').nth(1).click()
    await expect(page.locator('#delete-dialog')).toBeVisible()
    await page.fill('#delete-confirmation', 'delete')
    await waitForSuccessResponse(page, () => page.locator('#delete-button').click(), '/content')
    await expect(page.locator('#navigation-panel-details').getByText(`Name: ${telemetryName}`)).not.toBeVisible()

    // Delete Command
    const newCmdSection = page
      .locator('#navigation-panel-details')
      .locator('div', { has: page.getByText(`Name: ${commandName}`) })
    await newCmdSection.locator('.trash-icon').nth(2).click()
    await expect(page.locator('#delete-dialog')).toBeVisible()
    await page.fill('#delete-confirmation', 'delete')
    await waitForSuccessResponse(page, () => page.locator('#delete-button').click(), '/content')
    await expect(page.locator('#navigation-panel-details').getByText(`Name: ${commandName}`)).not.toBeVisible()
    await context.close()
  })
})

// Helpers

const testNavPanelEdit = async (page: Page, locator: Locator, newValue: string, successRoute: string) => {
  await expect(locator).toBeVisible()
  await locator.fill(newValue)
  await waitForSuccessResponse(page, () => page.mouse.click(0, 0), successRoute)
  await page.waitForTimeout(500)
}

const testNavPanelDropdownEdit = async (page: Page, locator: Locator, newOption: string, successRoute: string) => {
  await expect(locator).toBeVisible()
  await waitForSuccessResponse(page, () => locator.selectOption(newOption), successRoute)
  await page.waitForTimeout(500)
}

const openEditRepo = async (page: Page) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('./open')
  await expect(page.locator('#main-view').getByTitle('Upload New Ontology').first()).toBeVisible()

  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').first().click(),
    '/menu'
  )
  await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')

  const installation = page.locator('.github-list li').filter({ hasText: /digicatapult$/ })
  await expect(installation).toBeVisible()
  await waitForSuccessResponse(page, () => installation.click(), '/repos')
  expect(page.locator('.github-list').getByText('digicatapult/dtdl-test-fixtures')).toBeVisible()
  const testFixtures = page.locator('.github-list li').filter({ hasText: /digicatapult\/dtdl-test-fixtures$/ })
  await waitForSuccessResponse(page, () => testFixtures.click(), '/branches')

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
