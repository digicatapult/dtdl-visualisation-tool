import elkLayouts from '/lib/mermaid-elk/mermaid-layout-elk.esm.mjs'
import mermaid from '/lib/mermaid/mermaid.esm.mjs'

mermaid.registerLayoutLoaders(elkLayouts)

const config = {
  startOnLoad: true,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    rankSpacing: 0,
  },
  maxTextSize: 99999999,
  securityLevel: 'loose',
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

globalThis.callback = function callback(id) {
  htmx.ajax('GET', `/entity/${id}`, '#navigationPanel')
}
