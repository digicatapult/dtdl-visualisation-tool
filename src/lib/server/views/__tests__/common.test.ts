import { expect } from 'chai'
import { describe, it } from 'mocha'

describe('Page Component - Iubenda Policy Widget Integration', () => {
  it('should include the Iubenda widget script tag in rendered HTML', async () => {
    // Import dynamically to ensure JSX is loaded in the right context
    const { Page } = await import('../common.js')

    const testChild = '<div>Test Content</div>'
    const pageContent = await Page({ title: 'Test Page', children: testChild as any })
    const pageString = pageContent.toString()

    // Verify the Iubenda script tag is present
    expect(pageString).to.include('https://embeds.iubenda.com/widgets/bfba4c13-caab-42ef-8296-83f3b3e081ed.js')
    expect(pageString).to.include('<script type="text/javascript"')
  })

  it('should include the widget container div in the body', async () => {
    const { Page } = await import('../common.js')

    const testChild = '<div>Test Content</div>'
    const pageContent = await Page({ title: 'Test Page', children: testChild as any })
    const pageString = pageContent.toString()

    // Verify the widget container exists
    expect(pageString).to.include('<div id="iubenda-policy-widget">')
  })

  it('should render the widget container after content-main', async () => {
    const { Page } = await import('../common.js')

    const testChild = '<div id="my-content">Content</div>'
    const pageContent = await Page({ title: 'Test Page', children: testChild as any })
    const pageString = pageContent.toString()

    // Verify order: content-main should come before iubenda-policy-widget
    const contentMainIndex = pageString.indexOf('<div id="content-main"')
    const widgetIndex = pageString.indexOf('<div id="iubenda-policy-widget">')

    expect(contentMainIndex).to.be.greaterThan(-1)
    expect(widgetIndex).to.be.greaterThan(-1)
    expect(widgetIndex).to.be.greaterThan(contentMainIndex)
  })

  it('should include all required elements in correct order', async () => {
    const { Page } = await import('../common.js')

    const testChild = '<div>Content</div>'
    const pageContent = await Page({ title: 'Test Page', children: testChild as any })
    const pageString = pageContent.toString()

    // Check structure: script in head, container in body
    const scriptIndex = pageString.indexOf('embeds.iubenda.com/widgets')
    const headEndIndex = pageString.indexOf('</head>')
    const bodyStartIndex = pageString.indexOf('<body')
    const widgetContainerIndex = pageString.indexOf('id="iubenda-policy-widget"')

    // Script should be in head (before </head>)
    expect(scriptIndex).to.be.greaterThan(-1)
    expect(scriptIndex).to.be.lessThan(headEndIndex)

    // Widget container should be in body (after <body>)
    expect(widgetContainerIndex).to.be.greaterThan(bodyStartIndex)
  })

  it('should not affect other page elements', async () => {
    const { Page } = await import('../common.js')

    const testChild = '<div id="test-content">Test Content Here</div>'
    const pageContent = await Page({ title: 'Test Page', children: testChild as any })
    const pageString = pageContent.toString()

    // Verify all standard elements are still present
    expect(pageString).to.include('id="toast-container"')
    expect(pageString).to.include('id="content-main"')
    expect(pageString).to.include('Test Content Here')
    expect(pageString).to.include('/public/scripts/callbacks.js')
    expect(pageString).to.include('/public/styles/main.css')
  })
})
