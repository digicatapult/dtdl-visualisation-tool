const resetButton = document.getElementById('reset-pan-zoom')
const zoomInButton = document.getElementById('zoom-in')
const zoomOutButton = document.getElementById('zoom-out')

globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=flowchart`, '#navigationPanelContent')
  const layout = htmx.values(htmx.find('#layout-buttons'))
  const expandedIds = layout['expandedIds[]']

  // htmx.values returns single items as a string rather than array
  const expandedIdsArray = expandedIds ? (Array.isArray(expandedIds) ? expandedIds : [expandedIds]) : []
  // only append if not already expanded
  const appendedExpandedIds = expandedIdsArray.includes(id) ? expandedIdsArray : [...expandedIdsArray, id]

  htmx.ajax('GET', `/update-layout`, {
    target: '#mermaid-output',
    values: {
      ...layout,
      highlightNodeId: id,
      'expandedIds[]': appendedExpandedIds,
    },
  })
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
