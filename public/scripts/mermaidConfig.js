
globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=flowchart`, '#navigationPanelContent')
  const layout = htmx.values(htmx.find("#layout-buttons"))
  htmx.ajax('GET', `/update-layout`, { target: '#mermaid-output', values: { ...layout, highlightNodeId: id } })
}

globalThis.setMermaidListeners = function setMermaidListeners() {
  let nodes = document.getElementsByClassName('node clickable')
  for (let node of nodes) {
    let mermaidId = node.id.split('-').slice(1, -1).join('')
    node.setAttribute('onclick', `getEntity('${mermaidId}')`)
  }
}
