

window.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=mermaid`, '#navigationPanelContent')
  htmx.ajax('GET', `/update-layout/?highlightNodeId=${id}`, '#generatedMarkdown')
}
