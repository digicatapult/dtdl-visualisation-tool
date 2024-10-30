const resetButton = document.getElementById('reset-pan-zoom')
const zoomInButton = document.getElementById('zoom-in')
const zoomOutButton = document.getElementById('zoom-out')

globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?diagramType=flowchart`, '#navigationPanelContent')
  const layout = htmx.values(htmx.find('#layout-buttons'))
  htmx.ajax('GET', `/update-layout`, { target: '#mermaid-output', values: { ...layout, highlightNodeId: id } })
}

const nodeIdPattern = /^[^-]+\-(.+)\-\d+$/
globalThis.setMermaidListeners = function setMermaidListeners() {
  let nodes = document.getElementsByClassName('node clickable')
  for (let node of nodes) {
    let mermaidId = node.id.match(nodeIdPattern)
    if (mermaidId === null) {
      continue
    }
    node.setAttribute('onclick', `getEntity('${mermaidId[1]}')`)
  }

  const panZoom = svgPanZoom('#mermaid-svg', { maxZoom: 20 })
  resetButton.onclick = () => {
    panZoom.resetZoom()
    panZoom.resetPan()
  }
  zoomInButton.onclick = () => {
    panZoom.zoomIn()
  }
  zoomOutButton.onclick = () => {
    panZoom.zoomOut()
  }
}
