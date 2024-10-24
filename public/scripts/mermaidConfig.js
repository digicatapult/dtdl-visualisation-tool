
globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=flowchart`, '#navigationPanelContent')
  const layout = htmx.values(htmx.find("#layout-buttons"))
  htmx.ajax('GET', `/update-layout`, { target: '#mermaid-output', values: { ...layout, highlightNodeId: id } })
}

const nodeIdPattern = /^[^-]+\-(.+)\-\d+$/
globalThis.setMermaidListeners = function setMermaidListeners() {
  let nodes = document.getElementsByClassName('node clickable')
  for (let node of nodes) {
    let mermaidId = node.id.match(nodeIdPattern)
    if (mermaidId === null){
      continue
    }
    node.setAttribute('onclick', `getEntity('${mermaidId[1]}')`)
  }
}
