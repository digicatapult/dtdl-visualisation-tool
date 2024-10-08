import elkLayouts from '/lib/mermaid-elk/mermaid-layout-elk.esm.mjs'
import mermaid from '/lib/mermaid/mermaid.esm.mjs'

mermaid.registerLayoutLoaders(elkLayouts)

const config = {
  startOnLoad: false,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: false,
    nodeSpacing: 2555
  },
  maxTextSize: 99999999,
  securityLevel: 'loose',
  maxEdges: 99999999,
}

mermaid.initialize(config)

globalThis.renderMermaid = async function renderMermaid(mermaidOutputElement, mermaidMarkdown) {
  let element = document.getElementById(mermaidOutputElement)
  const graphDefinition = document.getElementById(mermaidMarkdown).innerText
  const { svg, bindFunctions } = await mermaid.render('tmpRenderedDiv', graphDefinition)
  element.innerHTML = svg
  bindFunctions(element)
}

globalThis.renderLayoutChange = async function renderLayoutChange(mermaidOutputElement, mermaidMarkdown, layoutType) {
  mermaid.mermaidAPI.updateSiteConfig({ layout: layoutType })
  await renderMermaid(mermaidOutputElement, mermaidMarkdown)
}

globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=mermaid`, '#navigationPanelContent')
}
