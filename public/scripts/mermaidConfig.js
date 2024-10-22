
function getParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const layout = urlParams.get('layout');
  const chartType = urlParams.get('chartType');
  const output = urlParams.get('output')

  return { layout: layout, chartType: chartType, output: output };
}

globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=flowchart`, '#navigationPanelContent')
  const layout = htmx.values(htmx.find("#layout-buttons"))
  const urlParams = getParams()
  htmx.ajax('GET', `/update-layout`, { target: '#mermaid-output', values: { 'highlightNodeId': id, ...layout, ...urlParams } })
}

globalThis.setMermaidListeners = function setMermaidListeners() {

  let nodes = document.getElementsByClassName('node clickable')
  for (let node of nodes) {
    let mermaidId = node.id.split('-').slice(1, -1).join('')
    node.setAttribute('onclick', `getEntity('${mermaidId}')`)
  }
}
