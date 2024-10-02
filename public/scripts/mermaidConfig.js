import elkLayouts from '/lib/mermaid-elk/mermaid-layout-elk.esm.mjs'
import mermaid from '/lib/mermaid/mermaid.esm.mjs'

mermaid.registerLayoutLoaders(elkLayouts)

const config = {
  startOnLoad: false,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    rankSpacing: 0,
  },
  maxTextSize: 99999999,
}

mermaid.initialize(config)

globalThis.renderMermaid = async function renderMermaid(mermaidOutputElement, mermaidMarkdown) {
  console.log('I RAN')
  let element = document.getElementById(mermaidOutputElement)
  const graphDefinition = document.getElementById(mermaidMarkdown).innerText
  const { svg } = await mermaid.render('tmpRenderedDiv', graphDefinition)
  element.innerHTML = svg
}

globalThis.renderLayoutChange = async function renderLayoutChange(mermaidOutputElement, mermaidMarkdown, layoutType) {
  mermaid.mermaidAPI.updateSiteConfig({ layout: layoutType })
  await renderMermaid(mermaidOutputElement, mermaidMarkdown)
}
