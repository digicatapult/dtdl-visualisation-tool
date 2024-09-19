import { expect } from 'chai'
import { describe, it } from 'mocha'
import MermaidTemplates from '../mermaid'

describe('HomepageTemplates', () => {
  it('should render homepage', async () => {
    const templates = new MermaidTemplates()
    const rendered = await templates.flowchart({ graph: '' })
    expect(rendered).to.matchSnapshot()
  })
})
