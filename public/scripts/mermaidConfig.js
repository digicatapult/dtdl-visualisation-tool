import elkLayouts from '/lib/mermaid-elk/mermaid-layout-elk.esm.mjs'
import mermaid from '/lib/mermaid/mermaid.esm.mjs'

mermaid.registerLayoutLoaders(elkLayouts)

const config = {
  startOnLoad: false,
  flowchart: {
    useMaxWidth: false,
    htmlLabels: false,
  },
  maxTextSize: 99999999,
  securityLevel: 'loose',
  maxEdges: 99999999,
}

mermaid.initialize(config)

globalThis.renderMermaid = async function renderMermaid(mermaidOutputElement, mermaidMarkdown) {
  let element = document.getElementById(mermaidOutputElement)
  const graphDefinition = document.getElementById(mermaidMarkdown).innerText
  if (!graphDefinition) {
    element.innerHTML = 'Not Found'
  }
  const { svg, bindFunctions } = await mermaid.render('mermaid-svg', graphDefinition)
  element.innerHTML = svg
  bindFunctions(element)
  const panZoom = svgPanZoom('#mermaid-svg', { maxZoom: 20 })
  document.getElementById('reset-pan-zoom').onclick = () => {
    panZoom.resetZoom()
    panZoom.resetPan()
  }
  document.getElementById('zoom-in').onclick = () => {
    panZoom.zoomIn()
  }
  document.getElementById('zoom-out').onclick = () => {
    panZoom.zoomOut()
  }
}

globalThis.renderLayoutChange = async function renderLayoutChange(mermaidOutputElement, mermaidMarkdown, layoutType) {
  mermaid.mermaidAPI.updateSiteConfig({ layout: layoutType })
  await renderMermaid(mermaidOutputElement, mermaidMarkdown)
}

globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=mermaid`, '#navigationPanelContent')
  highlightNode(id)
}

const highlightNode = (id) => {
  const mermaidOutputDiv = document.querySelector('#mermaid-output')
  const node = mermaidOutputDiv.querySelector(`g[id^="flowchart-${id}-"]`)
  if (node) {
    mermaidOutputDiv.querySelectorAll('.highlighted').forEach((el) => el.classList.remove('highlighted'))
    node.classList.add('highlighted')
  }
}
