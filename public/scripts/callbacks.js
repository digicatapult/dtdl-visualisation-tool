const resetButton = document.getElementById('reset-pan-zoom')
const zoomInButton = document.getElementById('zoom-in')
const zoomOutButton = document.getElementById('zoom-out')

const nodeIdPattern = /^[^-]+\-(.+)\-\d+$/

globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=flowchart`, '#navigationPanelContent')
  const layout = htmx.values(htmx.find('#layout-buttons'))

  const expandedIdsValue = layout['expandedIds[]'] ?? []
  // htmx.values returns single items as a string rather than array
  let expandedIds = Array.isArray(expandedIdsValue) ? expandedIdsValue : [expandedIdsValue]

  // only expand if node is currently unexpanded
  const unexpandedNodes = document.getElementsByClassName('node clickable unexpanded')
  for (const node of unexpandedNodes) {
    const mermaidId = node.id.match(nodeIdPattern)
    if (mermaidId && mermaidId[1] === id) {
      expandedIds = [...expandedIds, id]
      break
    }
  }

  htmx.ajax('GET', `/update-layout`, {
    target: '#mermaid-output',
    values: {
      ...layout,
      highlightNodeId: id,
      'expandedIds[]': expandedIds,
    },
  })
}

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
