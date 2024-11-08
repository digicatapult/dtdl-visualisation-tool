const resetButton = document.getElementById('reset-pan-zoom')
const zoomInButton = document.getElementById('zoom-in')
const zoomOutButton = document.getElementById('zoom-out')

const nodeIdPattern = /^[^-]+\-(.+)\-\d+$/

globalThis.getEntity = function getEntity(id) {
  const layout = htmx.values(htmx.find('#search-panel'))

  const expandedIdsValue = layout['expandedIds'] ?? []
  // if expandedIds is a single item, htmx.values returns a string rather than array
  let expandedIds = Array.isArray(expandedIdsValue) ? expandedIdsValue : [expandedIdsValue]

  // only expand if node is currently unexpanded
  const unexpandedNodes = document.getElementsByClassName('node clickable unexpanded')
  const shouldExpand = Array.from(unexpandedNodes).some((node) => {
    const mermaidId = node.id.match(nodeIdPattern)
    return mermaidId && mermaidId[1] === id
  })

  if (shouldExpand && !expandedIds.includes(id)) {
    expandedIds.push(id)
  }

  htmx.ajax('GET', `/update-layout`, {
    target: '#mermaid-output',
    values: {
      ...layout,
      highlightNodeId: id,
      expandedIds: expandedIds,
    },
  })
}

globalThis.setMermaidListeners = function setMermaidListeners() {

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
