

globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=mermaid`, '#navigationPanelContent')
  const urlQuery = htmx.values(htmx.find("#layout-buttons"))
  htmx.ajax('GET', `/update-layout`, { target: '#mermaid-output', values: { 'highlightNodeId': id, ...urlQuery } })
}

globalThis.setMermaidListeners = function setMermaidListeners() {

  let nodes = document.getElementsByClassName('node clickable')
  for (let node of nodes) {
    let mermaidId = node.id.split('-').slice(1, -1).join('')
    console.log(mermaidId)
    node.setAttribute('onclick', `getEntity('${mermaidId}')`)
  }

}
