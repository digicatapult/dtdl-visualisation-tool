globalThis.getEntity = function getEntity(id) {
  htmx.ajax('GET', `/entity/${id}?chartType=mermaid`, '#navigationPanelContent')
  htmx.ajax('GET', `/highlight-node/${id}, '#generatedMarkdown'`)
}
